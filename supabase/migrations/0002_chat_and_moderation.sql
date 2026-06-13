-- ============================================================
-- IIIT CONNECT — CHAT, MODERATION & APPROVALS
-- ============================================================

-- ---------- UTILITY FUNCTION ----------

-- Calculate year level from graduation_year (July = new academic year)
CREATE OR REPLACE FUNCTION get_year_level(p_graduation_year int)
RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_graduation_year IS NULL THEN 0
    ELSE GREATEST(1, LEAST(4,
      (CASE WHEN EXTRACT(MONTH FROM now()) >= 7
        THEN EXTRACT(YEAR FROM now())
        ELSE EXTRACT(YEAR FROM now()) - 1
      END) - (p_graduation_year - 4) + 1
    ))
  END;
$$;

-- Check if user is senior (3rd or 4th year)
CREATE OR REPLACE FUNCTION is_senior(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
      AND get_year_level(graduation_year) >= 3
  );
$$;

-- ---------- CHAT MESSAGES ----------

CREATE TABLE chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  sender_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body         text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_college_time ON chat_messages(college_slug, created_at DESC);
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);

-- ---------- MUTED USERS ----------

CREATE TABLE muted_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_by     uuid NOT NULL REFERENCES profiles(id),
  muted_until  timestamptz NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_muted_user ON muted_users(user_id, college_slug);

-- ---------- BAN SYSTEM ----------

CREATE TABLE ban_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voter_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  college_slug text NOT NULL,
  reason       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_id, voter_id, college_slug)
);

CREATE TABLE banned_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  college_slug text NOT NULL,
  banned_at    timestamptz NOT NULL DEFAULT now(),
  appeal_used  bool NOT NULL DEFAULT false,
  UNIQUE(user_id, college_slug)
);

CREATE TABLE unban_appeals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banned_user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  college_slug    text NOT NULL,
  appeal_reason   text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(banned_user_id, college_slug)
);

CREATE TABLE unban_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id  uuid NOT NULL REFERENCES unban_appeals(id) ON DELETE CASCADE,
  voter_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appeal_id, voter_id)
);

-- Auto-ban when 5 votes reached
CREATE OR REPLACE FUNCTION check_ban_threshold()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vote_count int;
BEGIN
  SELECT COUNT(*) INTO vote_count
  FROM ban_votes
  WHERE target_id = NEW.target_id AND college_slug = NEW.college_slug;

  IF vote_count >= 5 THEN
    INSERT INTO banned_users (user_id, college_slug)
    VALUES (NEW.target_id, NEW.college_slug)
    ON CONFLICT (user_id, college_slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_check_ban
  AFTER INSERT ON ban_votes
  FOR EACH ROW EXECUTE FUNCTION check_ban_threshold();

-- Auto-unban when 5 unban votes reached
CREATE OR REPLACE FUNCTION check_unban_threshold()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vote_count int;
  v_appeal unban_appeals%ROWTYPE;
BEGIN
  SELECT * INTO v_appeal FROM unban_appeals WHERE id = NEW.appeal_id;

  SELECT COUNT(*) INTO vote_count
  FROM unban_votes WHERE appeal_id = NEW.appeal_id;

  IF vote_count >= 5 THEN
    DELETE FROM banned_users
    WHERE user_id = v_appeal.banned_user_id AND college_slug = v_appeal.college_slug;

    UPDATE unban_appeals SET status = 'accepted' WHERE id = NEW.appeal_id;

    DELETE FROM ban_votes
    WHERE target_id = v_appeal.banned_user_id AND college_slug = v_appeal.college_slug;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_check_unban
  AFTER INSERT ON unban_votes
  FOR EACH ROW EXECUTE FUNCTION check_unban_threshold();

-- ---------- POST APPROVAL QUEUE (for juniors) ----------

CREATE TABLE pending_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type    text NOT NULL CHECK (post_type IN ('event','photo','review')),
  college_slug text NOT NULL,
  posted_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payload      jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pending_college ON pending_posts(college_slug, status);

CREATE TABLE post_approval_votes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_post_id uuid NOT NULL REFERENCES pending_posts(id) ON DELETE CASCADE,
  voter_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pending_post_id, voter_id)
);

-- Auto-approve when 5 senior votes reached
CREATE OR REPLACE FUNCTION check_approval_threshold()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vote_count int;
  v_post pending_posts%ROWTYPE;
BEGIN
  SELECT COUNT(*) INTO vote_count
  FROM post_approval_votes WHERE pending_post_id = NEW.pending_post_id;

  IF vote_count >= 5 THEN
    SELECT * INTO v_post FROM pending_posts WHERE id = NEW.pending_post_id;
    UPDATE pending_posts SET status = 'approved' WHERE id = NEW.pending_post_id;

    -- Auto-create the actual post based on type
    IF v_post.post_type = 'event' THEN
      INSERT INTO events (title, description, college_slug, type, event_date,
        registration_link, open_to_outsiders, posted_by)
      VALUES (
        v_post.payload->>'title', v_post.payload->>'description',
        v_post.college_slug, v_post.payload->>'type',
        (v_post.payload->>'event_date')::timestamptz,
        v_post.payload->>'registration_link',
        COALESCE((v_post.payload->>'open_to_outsiders')::bool, false),
        v_post.posted_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_check_approval
  AFTER INSERT ON post_approval_votes
  FOR EACH ROW EXECUTE FUNCTION check_approval_threshold();

-- ---------- RLS POLICIES ----------

-- Chat messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read chat" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Verified non-banned non-muted user can send" ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verification_status = 'verified' AND college_slug = chat_messages.college_slug) AND
    NOT EXISTS (SELECT 1 FROM banned_users WHERE user_id = auth.uid() AND college_slug = chat_messages.college_slug) AND
    NOT EXISTS (SELECT 1 FROM muted_users WHERE user_id = auth.uid() AND college_slug = chat_messages.college_slug AND muted_until > now())
  );

-- Muted users
ALTER TABLE muted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read mutes" ON muted_users FOR SELECT USING (true);
CREATE POLICY "Senior can mute junior" ON muted_users FOR INSERT
  WITH CHECK (
    auth.uid() = muted_by AND
    is_senior(auth.uid()) AND
    NOT is_senior(user_id) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND college_slug = muted_users.college_slug AND verification_status = 'verified')
  );

-- Ban votes
ALTER TABLE ban_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read ban votes" ON ban_votes FOR SELECT USING (true);
CREATE POLICY "Verified user can vote to ban non-verified" ON ban_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    auth.uid() != target_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verification_status = 'verified' AND college_slug = ban_votes.college_slug) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = target_id AND verification_status != 'verified')
  );

-- Banned users
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read bans" ON banned_users FOR SELECT USING (true);

-- Unban appeals
ALTER TABLE unban_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read appeals" ON unban_appeals FOR SELECT USING (true);
CREATE POLICY "Banned user can appeal once" ON unban_appeals FOR INSERT
  WITH CHECK (
    auth.uid() = banned_user_id AND
    EXISTS (SELECT 1 FROM banned_users WHERE user_id = auth.uid() AND college_slug = unban_appeals.college_slug AND appeal_used = false)
  );

-- Unban votes
ALTER TABLE unban_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read unban votes" ON unban_votes FOR SELECT USING (true);
CREATE POLICY "Verified user can vote to unban" ON unban_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verification_status = 'verified')
  );

-- Pending posts
ALTER TABLE pending_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read pending posts from own college" ON pending_posts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND college_slug = pending_posts.college_slug)
  );
CREATE POLICY "Verified user submit pending post" ON pending_posts FOR INSERT
  WITH CHECK (
    auth.uid() = posted_by AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verification_status = 'verified' AND college_slug = pending_posts.college_slug)
  );

-- Post approval votes
ALTER TABLE post_approval_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read approval votes" ON post_approval_votes FOR SELECT USING (true);
CREATE POLICY "Senior can approve" ON post_approval_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    is_senior(auth.uid())
  );

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
