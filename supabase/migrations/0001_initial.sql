-- ============================================================
-- IIIT CONNECT — INITIAL MIGRATION (corrected)
-- ============================================================

-- ---------- TABLES ----------

CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text UNIQUE,                -- nullable: set during onboarding
  full_name    text,
  college_slug text,
  branch       text,
  graduation_year int,
  bio          text,
  linkedin_url text,
  instagram_url text,
  is_alumni    bool NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified'
                CHECK (verification_status IN ('verified','pending','unverified')),
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_college_slug ON profiles(college_slug);

CREATE TABLE college_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  uploader_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url          text NOT NULL,
  caption      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_college ON college_photos(college_slug);

CREATE TABLE campus_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  reviewer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating       int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body         text NOT NULL,
  review_type  text NOT NULL CHECK (review_type IN ('Hostel','Mess','Infrastructure','Campus Life')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_college ON campus_reviews(college_slug);

CREATE TABLE clubs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  college_slug text NOT NULL,
  type         text NOT NULL CHECK (type IN ('Technical','Cultural','Sports','Literary','Social','Other')),
  description  text,
  logo_url     text,
  social_links jsonb DEFAULT '{}',
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by   uuid NOT NULL REFERENCES profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clubs_college ON clubs(college_slug);
CREATE INDEX idx_clubs_status ON clubs(status);

CREATE TABLE club_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
CREATE INDEX idx_club_members_user ON club_members(user_id);

CREATE TABLE events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  description        text,
  college_slug       text NOT NULL,
  type               text NOT NULL CHECK (type IN ('Hackathon','Cultural Fest','Workshop','Seminar','Sports','Other')),
  event_date         timestamptz NOT NULL,
  registration_link  text,
  open_to_outsiders  bool NOT NULL DEFAULT false,
  posted_by          uuid NOT NULL REFERENCES profiles(id),
  club_id            uuid REFERENCES clubs(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_college ON events(college_slug);
CREATE INDEX idx_events_date ON events(event_date);

CREATE TABLE event_interests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text,
  college_tag text NOT NULL,
  topic_tag   text NOT NULL CHECK (topic_tag IN ('Academics','Hostel','Placements','Clubs','Counselling','Campus Life','Other')),
  asked_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_college ON questions(college_tag);

CREATE TABLE answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  body        text NOT NULL,
  answered_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_answers_question ON answers(question_id);

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('profile','event','club','question','answer')),
  target_id   uuid NOT NULL,
  reason      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- FUNCTIONS & TRIGGERS ----------

-- FIX #4 (recursion): admin check runs as definer, outside RLS
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id AND user_id = p_user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_club_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id AND user_id = p_user_id
  );
$$;

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- FIX #1 (self-verification): protected columns revert silently
-- unless the request comes from the service role
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    NEW.verification_status := OLD.verification_status;
    NEW.college_slug        := OLD.college_slug;
    NEW.is_alumni           := OLD.is_alumni;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- FIX #3 (founder bootstrap): club creator auto-becomes admin
CREATE OR REPLACE FUNCTION add_club_founder()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_add_club_founder
  AFTER INSERT ON clubs
  FOR EACH ROW EXECUTE FUNCTION add_club_founder();

-- ---------- ROW LEVEL SECURITY ----------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Owner insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Owner update profile" ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- (protected columns enforced by trg_protect_profile_columns)

ALTER TABLE college_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read photos" ON college_photos FOR SELECT USING (true);
CREATE POLICY "Verified college member insert photo" ON college_photos FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND college_slug = college_photos.college_slug
        AND verification_status = 'verified'
    )
  );
CREATE POLICY "Uploader delete own photo" ON college_photos FOR DELETE
  USING (auth.uid() = uploader_id);

ALTER TABLE campus_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews" ON campus_reviews FOR SELECT USING (true);
CREATE POLICY "Verified college member insert review" ON campus_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND college_slug = campus_reviews.college_slug
        AND verification_status = 'verified'
    )
  );
CREATE POLICY "Reviewer delete own review" ON campus_reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
-- FIX: creators can see their own pending/rejected club
CREATE POLICY "Read approved or own clubs" ON clubs FOR SELECT
  USING (status = 'approved' OR created_by = auth.uid());
CREATE POLICY "Verified student insert club" ON clubs FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verification_status = 'verified')
  );
CREATE POLICY "Creator update club" ON clubs FOR UPDATE
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read club members" ON club_members FOR SELECT USING (true);
-- FIX #4: no self-referencing subquery — use SECURITY DEFINER fn
CREATE POLICY "Club admin add members" ON club_members FOR INSERT
  WITH CHECK (is_club_admin(club_members.club_id, auth.uid()));
CREATE POLICY "Member leave or admin remove" ON club_members FOR DELETE
  USING (user_id = auth.uid() OR is_club_admin(club_members.club_id, auth.uid()));

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Verified student insert personal event" ON events FOR INSERT
  WITH CHECK (
    club_id IS NULL AND
    auth.uid() = posted_by AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verification_status = 'verified')
  );
CREATE POLICY "Club member insert club event" ON events FOR INSERT
  WITH CHECK (
    club_id IS NOT NULL AND
    auth.uid() = posted_by AND
    is_club_member(events.club_id, auth.uid())
  );
CREATE POLICY "Poster update own event" ON events FOR UPDATE
  USING (auth.uid() = posted_by) WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "Poster delete own event" ON events FOR DELETE
  USING (auth.uid() = posted_by);

ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read interests" ON event_interests FOR SELECT USING (true);
CREATE POLICY "Auth user register interest" ON event_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User delete own interest" ON event_interests FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);
-- FIX #2: logged-in users must own their question; anonymous inserts
-- happen ONLY via service-role route handler after Turnstile validation
CREATE POLICY "Auth user insert own question" ON questions FOR INSERT
  WITH CHECK (auth.uid() = asked_by);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read answers" ON answers FOR SELECT USING (true);
CREATE POLICY "Verified college member insert answer" ON answers FOR INSERT
  WITH CHECK (
    auth.uid() = answered_by AND
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN questions q ON q.id = answers.question_id
      WHERE p.id = auth.uid()
        AND p.college_slug = q.college_tag
        AND p.verification_status = 'verified'
    )
  );
CREATE POLICY "Answerer delete own answer" ON answers FOR DELETE
  USING (auth.uid() = answered_by);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert report" ON reports FOR INSERT
  WITH CHECK (reporter_id IS NULL OR auth.uid() = reporter_id);
-- No SELECT policy: reports reviewed via Supabase Studio only.

-- ---------- STORAGE POLICIES ----------
-- Run AFTER creating buckets: avatars, college-photos, club-logos (public),
-- alumni-id-uploads (private)

CREATE POLICY "Public read public buckets" ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars','college-photos','club-logos'));

-- Users upload only under their own uid/ prefix
CREATE POLICY "Verified user upload to own prefix" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('avatars','college-photos','club-logos') AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verification_status = 'verified')
  );

-- Avatars: any authenticated user (verification not required to set avatar)
CREATE POLICY "Auth user upload avatar" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "User delete own objects" ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('avatars','college-photos','club-logos') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Alumni ID uploads: owner can write, NOBODY can read via API
-- (service role bypasses RLS — review in Studio)
CREATE POLICY "Owner upload alumni id" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'alumni-id-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
