"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COLLEGES, TOPIC_TAGS } from "@/lib/colleges";

export default function NewQuestionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [collegeTag, setCollegeTag] = useState(COLLEGES[0]?.slug ?? "");
  const [topicTag, setTopicTag] = useState<string>(TOPIC_TAGS[0]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("questions").insert({
      title, body: body || null,
      college_tag: collegeTag,
      topic_tag: topicTag,
      asked_by: userId,
    });
    setLoading(false);
    if (error) setMsg(error.message);
    else { router.push("/ask"); router.refresh(); }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Ask a question</h1>
      <p className="mt-1 text-sm text-slate-400">Verified students from that college will be able to answer.</p>
      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Question</label>
          <input id="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How is the hostel food at IIIT-D?" />
        </div>
        <div>
          <label className="label" htmlFor="body">Details (optional)</label>
          <textarea id="body" className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="college">College</label>
            <select id="college" className="input" value={collegeTag} onChange={(e) => setCollegeTag(e.target.value)}>
              {COLLEGES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="topic">Topic</label>
            <select id="topic" className="input" value={topicTag} onChange={(e) => setTopicTag(e.target.value)}>
              {TOPIC_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? "Posting…" : "Post question"}
        </button>
        {msg && <p className="text-sm text-red-400">{msg}</p>}
      </form>
    </div>
  );
}
