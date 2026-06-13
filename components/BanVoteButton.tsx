"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  targetId: string;
  collegeSlug: string;
}

export default function BanVoteButton({ targetId, collegeSlug }: Props) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Check if current user is verified
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();
      if (myProfile?.verification_status !== "verified") return;

      // Check if target user is non-verified
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", targetId)
        .single();
      if (!targetProfile || targetProfile.verification_status === "verified") return;

      setVisible(true);

      // Get current vote count
      const { count } = await supabase
        .from("ban_votes")
        .select("*", { count: "exact", head: true })
        .eq("target_id", targetId)
        .eq("college_slug", collegeSlug);
      setVoteCount(count ?? 0);

      // Check if already voted
      const { data: existing } = await supabase
        .from("ban_votes")
        .select("id")
        .eq("target_id", targetId)
        .eq("college_slug", collegeSlug)
        .eq("voter_id", user.id)
        .maybeSingle();
      if (existing) setVoted(true);
    })();
  }, [targetId, collegeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVote() {
    if (!userId || voted) return;
    const reason = window.prompt("Reason for reporting this user:");
    if (!reason) return;

    setLoading(true);
    const { error } = await supabase.from("ban_votes").insert({
      target_id: targetId,
      college_slug: collegeSlug,
      voter_id: userId,
      reason,
    });
    setLoading(false);

    if (!error) {
      setVoted(true);
      setVoteCount((c) => c + 1);
    }
  }

  if (!visible) return null;

  return (
    <button
      onClick={handleVote}
      disabled={voted || loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {voted ? "✓ Voted to ban" : loading ? "Submitting…" : "⚑ Report & Vote to Ban"}
      <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px]">
        {voteCount}
      </span>
    </button>
  );
}
