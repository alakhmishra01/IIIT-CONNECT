import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCollege } from "@/lib/colleges";
import type { EventRow, Profile } from "@/lib/types";
import InterestButton from "@/components/InterestButton";

export const revalidate = 300;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();
  const e = event as EventRow;
  const college = getCollege(e.college_slug);
  const { data: poster } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", e.posted_by).single();
  const { count: interested } = await supabase.from("event_interests").select("*", { count: "exact", head: true }).eq("event_id", id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/events" className="text-sm text-slate-400 hover:text-white">← Back to events</Link>
      <div className="card mt-4 p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="rounded bg-amber/20 px-2 py-1 text-amber">{e.type}</span>
          {e.open_to_outsiders && <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-400">Open to all IIITs</span>}
        </div>
        <h1 className="mt-3 text-3xl font-bold">{e.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
          {college && <span>{college.name}</span>}
          <span>{new Date(e.event_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {e.description && <p className="mt-4 text-slate-300 whitespace-pre-wrap">{e.description}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {e.registration_link && (
            <a href={e.registration_link} target="_blank" rel="noopener noreferrer" className="btn-cta text-sm">Register →</a>
          )}
          <InterestButton eventId={id} />
          <span className="text-sm text-slate-400">{interested ?? 0} interested</span>
        </div>
        {poster && (
          <div className="mt-6 border-t border-white/10 pt-4 text-sm text-slate-400">
            Posted by{" "}
            {poster.username ? (
              <Link href={`/profile/${poster.username}`} className="text-indigo hover:underline">{poster.full_name ?? poster.username}</Link>
            ) : (
              <span>{poster.full_name ?? "Anonymous"}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
