import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COLLEGES } from "@/lib/colleges";

export const revalidate = 3600;

export default async function Home() {
  const supabase = await createClient();
  const [{ count: events }, { count: questions }] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
  ]);

  const audiences = [
    { title: "For Current Students", body: "Post events, register your club, and collaborate across campuses." },
    { title: "For Aspirants", body: "Compare cutoff trends, browse real campus photos, and ask seniors directly." },
    { title: "For Alumni", body: "Stay connected, answer questions, and represent your alma mater." },
  ];

  return (
    <div className="py-12 text-center">
      <h1 className="font-heading text-5xl font-bold">Every IIIT. <span className="text-indigo">One place.</span></h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-400">Events, clubs, cutoffs, reviews and honest answers from verified students across all IIITs.</p>
      <div className="mt-8 flex justify-center gap-8">
        {[[COLLEGES.length, "Colleges"], [events ?? 0, "Events"], [questions ?? 0, "Questions"]].map(([n, label]) => (
          <div key={String(label)}>
            <div className="font-heading text-3xl font-bold text-amber">{n}</div>
            <div className="text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/colleges" className="btn-cta">Explore Colleges</Link>
        <Link href="/auth/signup" className="btn-primary">Join with college email</Link>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        {audiences.map((a) => (
          <div key={a.title} className="card p-6 text-left">
            <h3 className="font-heading text-lg font-semibold text-indigo">{a.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
