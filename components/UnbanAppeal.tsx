"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  collegeSlug: string;
}

interface Appeal {
  id: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function UnbanAppeal({ collegeSlug }: Props) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [unbanVoteCount, setUnbanVoteCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Check if user is banned in this college
      const { data: ban } = await supabase
        .from("bans")
        .select("id")
        .eq("user_id", user.id)
        .eq("college_slug", collegeSlug)
        .eq("active", true)
        .maybeSingle();
      if (!ban) return;
      setIsBanned(true);

      // Check for existing appeal
      const { data: existingAppeal } = await supabase
        .from("unban_appeals")
        .select("id, reason, status, created_at")
        .eq("user_id", user.id)
        .eq("college_slug", collegeSlug)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAppeal) {
        setAppeal(existingAppeal as Appeal);

        // Get unban vote count for this appeal
        const { count } = await supabase
          .from("unban_votes")
          .select("*", { count: "exact", head: true })
          .eq("appeal_id", existingAppeal.id);
        setUnbanVoteCount(count ?? 0);
      }
    })();
  }, [collegeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmitAppeal() {
    if (!userId) return;
    const reason = window.prompt("Why should you be unbanned? Explain your case:");
    if (!reason) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("unban_appeals")
      .insert({
        user_id: userId,
        college_slug: collegeSlug,
        reason,
        status: "pending",
      })
      .select()
      .single();
    setLoading(false);

    if (error) {
      setMsg(error.message);
    } else if (data) {
      setAppeal(data as Appeal);
      setMsg("Appeal submitted successfully.");
    }
  }

  if (!isBanned) return null;

  return (
    <div className="card border-red-500/30 bg-red-500/5 p-5">
      <h3 className="text-lg font-semibold text-red-400">⛔ You are banned from this college</h3>
      <p className="mt-1 text-sm text-slate-400">
        Your account has been restricted by community votes.
      </p>

      {appeal ? (
        <div className="mt-4 space-y-2">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs text-slate-400">Your appeal</p>
            <p className="mt-1 text-sm text-slate-300">{appeal.reason}</p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className={
                appeal.status === "approved" ? "text-emerald-400" :
                appeal.status === "rejected" ? "text-red-400" :
                "text-amber"
              }>
                Status: {appeal.status}
              </span>
              <span className="text-slate-500">
                Unban votes: {unbanVoteCount}/5
              </span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleSubmitAppeal}
          disabled={loading}
          className="btn-primary mt-4 text-sm"
        >
          {loading ? "Submitting…" : "Submit Appeal"}
        </button>
      )}

      {msg && (
        <p className={`mt-2 text-sm ${msg.includes("success") ? "text-emerald-400" : "text-red-400"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
