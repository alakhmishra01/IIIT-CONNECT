"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  appealId: string;
}

export default function UnbanVoteButton({ appealId }: Props) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Check if current user is verified
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();
      if (profile?.verification_status !== "verified") return;
      setIsVerified(true);

      // Get current vote count
      const { count } = await supabase
        .from("unban_votes")
        .select("*", { count: "exact", head: true })
        .eq("appeal_id", appealId);
      setVoteCount(count ?? 0);

      // Check if already voted
      const { data: existing } = await supabase
        .from("unban_votes")
        .select("id")
        .eq("appeal_id", appealId)
        .eq("voter_id", user.id)
        .maybeSingle();
      if (existing) setVoted(true);
    })();
  }, [appealId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVote() {
    if (!userId || voted) return;
    setLoading(true);
    const { error } = await supabase.from("unban_votes").insert({
      appeal_id: appealId,
      voter_id: userId,
    });
    setLoading(false);

    if (!error) {
      setVoted(true);
      setVoteCount((c) => c + 1);
    }
  }

  if (!isVerified) return null;

  return (
    <button
      onClick={handleVote}
      disabled={voted || loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {voted ? "✓ Voted to unban" : loading ? "Voting…" : "Vote to Unban"}
      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px]">
        {voteCount}/5
      </span>
    </button>
  );
}
