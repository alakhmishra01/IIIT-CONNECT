import Link from "next/link";
import { COLLEGES } from "@/lib/colleges";

export const metadata = { title: "All IIITs — IIIT Connect" };

export default function CollegesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Colleges</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {COLLEGES.map((c) => (
          <Link key={c.slug} href={`/colleges/${c.slug}`} className="card block p-6">
            <h2 className="font-heading text-lg font-semibold">{c.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{c.location} · Est. {c.established}</p>
            <p className="mt-3 text-sm text-indigo">Cutoffs, photos, reviews, Q&A →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
