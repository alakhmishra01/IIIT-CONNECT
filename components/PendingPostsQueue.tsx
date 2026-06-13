"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getYearLevel } from "@/lib/seniority";

interface Props {
  collegeSlug: string;
}

interface PendingPost {
  id: string;
  title: string;
  body: string | null;
  posted_by: string;
  created_at: string;
  approval_count: number;
  already_approved: boolean;
}

export default function PendingPostsQueue({ collegeSlug }: Props) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSenior, setIsSenior] = useState(false);
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Check if current user is a senior (3rd or 4th year)
      const { data: profile } = await supabase
        .from("profiles")
        .select("graduation_year, verification_status")
        .eq("id", user.id)
        .single();
      if (!profile || profile.verification_status !== "verified") {
        setLoading(false);
        return;
      }

      const yearLevel = getYearLevel(profile.graduation_year);
      setIsSenior(yearLevel >= 3);

      // Fetch pending posts for this college
      const { data: pendingPosts } = await supabase
        .from("posts")
        .select("id, title, body, posted_by, created_at")
        .eq("college_slug", collegeSlug)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (!pendingPosts) { setLoading(false); return; }

      // Get approval counts and check if user already approved each
      const enriched: PendingPost[] = await Promise.all(
        pendingPosts.map(async (post) => {
          const { count } = await supabase
            .from("post_approvals")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          const { data: myApproval } = await supabase
            .from("post_approvals")
            .select("id")
            .eq("post_id", post.id)
            .eq("approver_id", user.id)
            .maybeSingle();

          return {
            ...post,
            approval_count: count ?? 0,
            already_approved: !!myApproval,
          };
        })
      );

      setPosts(enriched);
      setLoading(false);
    })();
  }, [collegeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove(postId: string) {
    if (!userId) return;

    const { error } = await supabase.from("post_approvals").insert({
      post_id: postId,
      approver_id: userId,
    });

    if (!error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, approval_count: p.approval_count + 1, already_approved: true }
            : p
        )
      );
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading pending posts…</p>;
  if (!posts.length) return <p className="text-sm text-slate-500">No pending posts.</p>;

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold">{post.title}</h4>
              {post.body && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{post.body}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {new Date(post.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full bg-amber/20 px-2 py-0.5 text-xs text-amber">
                {post.approval_count}/5
              </span>
              {isSenior && (
                <button
                  onClick={() => handleApprove(post.id)}
                  disabled={post.already_approved}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo/20 px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {post.already_approved ? "✓ Approved" : "Approve"}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
