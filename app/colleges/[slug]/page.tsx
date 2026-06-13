import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { COLLEGES, getCollege } from "@/lib/colleges";
import { createClient } from "@/lib/supabase/server";
import CutoffChart from "@/components/CutoffChart";
import type { CutoffData, Photo, Review, Club, EventRow } from "@/lib/types";

export const revalidate = 3600;
export function generateStaticParams() { return COLLEGES.map((c) => ({ slug: c.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const college = getCollege(slug);
  return {
    title: `${college?.name} — Cutoffs, Events, Reviews | IIIT Connect`,
    description: `Explore ${college?.name}: JoSAA cutoff trends, campus photos, hostel reviews, clubs, events, and Q&A from current students.`,
    openGraph: { title: `${college?.name} | IIIT Connect`, description: `Real student insights for ${college?.name}.`, type: "website" },
  };
}

async function loadCutoffs(slug: string): Promise<CutoffData | null> {
  try { return (await import(`@/data/cutoffs/${slug}.json`)).default as CutoffData; }
  catch { return null; }
}

export default async function CollegePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = getCollege(slug);
  if (!college) notFound();

  const supabase = await createClient();
  const [cutoffs, photos, reviews, clubs, events] = await Promise.all([
    loadCutoffs(slug),
    supabase.from("college_photos").select("*").eq("college_slug", slug).order("created_at", { ascending: false }).limit(12),
    supabase.from("campus_reviews").select("*").eq("college_slug", slug).order("created_at", { ascending: false }).limit(10),
    supabase.from("clubs").select("*").eq("college_slug", slug).eq("status", "approved"),
    supabase.from("events").select("*").eq("college_slug", slug).gte("event_date", new Date().toISOString()).order("event_date").limit(6),
  ]);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl font-bold">{college.name}</h1>
        <p className="mt-2 text-slate-400">{college.location} · Established {college.established}</p>
        <div className="mt-4 flex gap-3">
          <Link href={`/colleges/${slug}/chat`} className="btn-cta text-sm">💬 Join College Chat</Link>
          <Link href={`/colleges/${slug}/moderation`} className="btn-primary text-sm">🛡️ Moderation</Link>
        </div>
      </header>

      {cutoffs && (
        <section>
          <h2 className="text-2xl font-semibold">Cutoff Trends (JoSAA)</h2>
          <div className="mt-2 rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm text-amber">
            Data is for reference only. Always verify at josaa.nic.in before making decisions.
          </div>
          <CutoffChart data={cutoffs} />
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold">Campus Photos</h2>
        {photos.data?.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {(photos.data as Photo[]).map((p) => (
              <figure key={p.id} className="card overflow-hidden">
                <Image src={p.url} alt={p.caption ?? "Campus photo"} width={400} height={300} className="h-40 w-full object-cover" />
                {p.caption && <figcaption className="p-2 text-xs text-slate-400">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">No photos yet. Verified students of {college.name} can add the first one.</p>}
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Hostel & Campus Reviews</h2>
        {reviews.data?.length ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {(reviews.data as Review[]).map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="rounded bg-indigo/20 px-2 py-0.5 text-indigo">{r.review_type}</span>
                  <span className="text-amber" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{r.body}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">No reviews yet.</p>}
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Clubs & Societies</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {(clubs.data as Club[] | null)?.map((c) => (
            <Link key={c.id} href={`/clubs/${c.slug}`} className="card px-4 py-2 text-sm">{c.name} <span className="text-slate-500">· {c.type}</span></Link>
          )) ?? <p className="text-sm text-slate-500">No clubs registered yet.</p>}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Upcoming Events</h2>
          <Link href={`/events?college=${slug}`} className="text-sm text-indigo">View all →</Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(events.data as EventRow[] | null)?.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="card block p-4">
              <span className="text-xs text-amber">{e.type}</span>
              <h3 className="mt-1 font-semibold">{e.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{new Date(e.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </Link>
          )) ?? null}
        </div>
        <div className="mt-4 flex gap-3">
          <Link href={`/ask?college=${slug}`} className="btn-primary text-sm">Ask a senior from {college.name}</Link>
        </div>
      </section>
    </div>
  );
}
