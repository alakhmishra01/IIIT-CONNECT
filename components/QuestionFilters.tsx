"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { COLLEGES, TOPIC_TAGS, getCollege } from "@/lib/colleges";
import type { Question } from "@/lib/types";

export default function QuestionFilters({ questions }: { questions: Question[] }) {
  const [college, setCollege] = useState("");
  const [topic, setTopic] = useState("");

  const filtered = useMemo(() => questions.filter((q) =>
    (!college || q.college_tag === college) &&
    (!topic || q.topic_tag === topic)
  ), [questions, college, topic]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ask a Senior</h1>
        <Link href="/ask/new" className="btn-cta text-sm">+ Ask a question</Link>
      </div>
      <p className="mt-2 text-slate-400">Get honest answers from verified students and alumni.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select aria-label="Filter by college" className="input max-w-[220px]" value={college} onChange={(e) => setCollege(e.target.value)}>
          <option value="">All colleges</option>
          {COLLEGES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Filter by topic" className="input max-w-[180px]" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {TOPIC_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="mt-6 space-y-3">
        {filtered.map((q) => {
          const col = getCollege(q.college_tag);
          return (
            <Link key={q.id} href={`/ask/${q.id}`} className="card block p-5">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-indigo/20 px-2 py-0.5 text-indigo">{q.topic_tag}</span>
                {col && <span className="text-slate-500">{col.name}</span>}
              </div>
              <h2 className="mt-2 font-heading text-lg font-semibold">{q.title}</h2>
              {q.body && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{q.body}</p>}
              <p className="mt-2 text-xs text-slate-500">{new Date(q.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </Link>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-500">No questions yet. Be the first to ask!</p>}
      </div>
    </div>
  );
}
