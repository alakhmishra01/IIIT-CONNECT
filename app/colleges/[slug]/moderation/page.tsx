"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCollege } from "@/lib/colleges";
import PendingPostsQueue from "@/components/PendingPostsQueue";
import UnbanAppeal from "@/components/UnbanAppeal";
import UnbanVoteButton from "@/components/UnbanVoteButton";

interface BanRecord {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
  username: string | null;
}

interface AppealRecord {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  username: string | null;
}

export default function ModerationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const college = getCollege(slug);
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Check if user is a verified student of this college
      const { data: profile } = await supabase
        .from("profiles")
        .select("college_slug, verification_status")
        .eq("id", user.id)
        .single();

      if (
        !profile ||
        profile.verification_status !== "verified" ||
        profile.college_slug !== slug
      ) {
        setLoading(false);
        return;
      }

      setAuthorized(true);

      // Fetch active bans for this college
      const { data: banData } = await supabase
        .from("bans")
        .select("id, user_id, reason, created_at")
        .eq("college_slug", slug)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (banData) {
        const enrichedBans: BanRecord[] = await Promise.all(
          banData.map(async (ban) => {
            const { data: p } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", ban.user_id)
              .single();
            return { ...ban, username: p?.username ?? null };
          })
        );
        setBans(enrichedBans);
      }

      // Fetch pending appeals for this college
      const { data: appealData } = await supabase
        .from("unban_appeals")
        .select("id, user_id, reason, status, created_at")
        .eq("college_slug", slug)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (appealData) {
        const enrichedAppeals: AppealRecord[] = await Promise.all(
          appealData.map(async (appeal) => {
            const { data: p } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", appeal.user_id)
              .single();
            return { ...appeal, username: p?.username ?? null };
          })
        );
        setAppeals(enrichedAppeals);
      }

      setLoading(false);
    })();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="text-slate-400">Loading…</p>;

  if (!authorized) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
        <p className="mt-2 text-slate-400">
          Only verified students of this college can access moderation.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Moderation</h1>
        <p className="mt-1 text-slate-400">{college?.name ?? slug}</p>
      </header>

      {/* Current user's own ban appeal (if applicable) */}
      <UnbanAppeal collegeSlug={slug} />

      {/* Pending Posts Queue */}
      <section>
        <h2 className="text-xl font-semibold">Pending Posts</h2>
        <p className="mt-1 text-sm text-slate-400">
          Posts awaiting senior approval (5 approvals needed)
        </p>
        <div className="mt-4">
          <PendingPostsQueue collegeSlug={slug} />
        </div>
      </section>

      {/* Active Bans */}
      <section>
        <h2 className="text-xl font-semibold">Active Bans</h2>
        {bans.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No active bans.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {bans.map((ban) => (
              <div key={ban.id} className="card border-red-500/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-400">
                      @{ban.username ?? "unknown"}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-400">{ban.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Banned {new Date(ban.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Unban Appeals */}
      <section>
        <h2 className="text-xl font-semibold">Unban Appeals</h2>
        {appeals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No pending appeals.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {appeals.map((appeal) => (
              <div key={appeal.id} className="card border-amber/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-amber">
                      @{appeal.username ?? "unknown"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">{appeal.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Appealed {new Date(appeal.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <UnbanVoteButton appealId={appeal.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
