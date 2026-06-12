"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AnswerForm({ questionId, collegeTag }: { questionId: string; collegeTag: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsg("Please sign in to answer."); return; }
    setLoading(true);
    const { error } = await supabase.from("answers").insert({
      question_id: questionId,
      body,
      answered_by: user.id,
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("policy")) {
        setMsg("Only verified students from this college can answer.");
      } else {
        setMsg(error.message);
      }
    } else {
      setBody("");
      setMsg(null);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 space-y-3 p-5">
      <textarea
        className="input"
        rows={4}
        required
        placeholder="Share your experience or knowledge…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Only verified students from this college can answer.</p>
        <button type="submit" disabled={loading} className="btn-primary text-sm">
          {loading ? "Posting…" : "Post answer"}
        </button>
      </div>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </form>
  );
}
