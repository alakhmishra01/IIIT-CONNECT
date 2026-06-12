import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCollege } from "@/lib/colleges";
import type { Question, Answer } from "@/lib/types";
import AnswerForm from "@/components/AnswerForm";

export const revalidate = 60;

export default async function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: question } = await supabase.from("questions").select("*").eq("id", id).single();
  if (!question) notFound();
  const q = question as Question;
  const college = getCollege(q.college_tag);

  const { data: answers } = await supabase
    .from("answers")
    .select("*, profiles(username, full_name, avatar_url, is_alumni, college_slug)")
    .eq("question_id", id)
    .order("created_at");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/ask" className="text-sm text-slate-400 hover:text-white">← Back to questions</Link>
      <div className="card mt-4 p-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-indigo/20 px-2 py-0.5 text-indigo">{q.topic_tag}</span>
          {college && <span className="text-slate-500">{college.name}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold">{q.title}</h1>
        {q.body && <p className="mt-3 text-slate-300 whitespace-pre-wrap">{q.body}</p>}
        <p className="mt-3 text-xs text-slate-500">
          Asked on {new Date(q.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{answers?.length ?? 0} Answer{answers?.length !== 1 ? "s" : ""}</h2>
        <div className="mt-4 space-y-4">
          {answers?.map((a: any) => (
            <div key={a.id} className="card p-5">
              <p className="text-slate-200 whitespace-pre-wrap">{a.body}</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                {a.profiles?.avatar_url && <img src={a.profiles.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />}
                {a.profiles?.username ? (
                  <Link href={`/profile/${a.profiles.username}`} className="hover:text-indigo">{a.profiles.full_name ?? a.profiles.username}</Link>
                ) : (
                  <span>{a.profiles?.full_name ?? "Anonymous"}</span>
                )}
                {a.profiles?.is_alumni && <span className="rounded bg-amber/20 px-1.5 py-0.5 text-xs text-amber">Alumni</span>}
                <span>·</span>
                <span>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Your Answer</h2>
        <AnswerForm questionId={id} collegeTag={q.college_tag} />
      </section>
    </div>
  );
}
