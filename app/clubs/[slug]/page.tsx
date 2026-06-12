import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCollege } from "@/lib/colleges";
import type { Club, Profile, EventRow } from "@/lib/types";

export const revalidate = 300;

export default async function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: club } = await supabase.from("clubs").select("*").eq("slug", slug).single();
  if (!club) notFound();
  const c = club as Club;
  const college = getCollege(c.college_slug);

  const { data: members } = await supabase
    .from("club_members")
    .select("role, user_id, profiles(username, full_name, avatar_url)")
    .eq("club_id", c.id)
    .order("role");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", c.id)
    .gte("event_date", new Date().toISOString())
    .order("event_date")
    .limit(6);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/clubs" className="text-sm text-slate-400 hover:text-white">← All clubs</Link>
      <div className="card mt-4 p-6">
        <div className="flex items-center gap-4">
          {c.logo_url && <img src={c.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />}
          <div>
            <h1 className="text-3xl font-bold">{c.name}</h1>
            <p className="text-sm text-slate-400">{college?.name} · {c.type}</p>
          </div>
        </div>
        {c.description && <p className="mt-4 text-slate-300 whitespace-pre-wrap">{c.description}</p>}
        {c.social_links && Object.keys(c.social_links).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(c.social_links).map(([platform, url]) => (
              <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo hover:underline capitalize">{platform}</a>
            ))}
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Members ({members?.length ?? 0})</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {members?.map((m: any) => (
            <div key={m.user_id} className="card flex items-center gap-3 p-3">
              {m.profiles?.avatar_url && <img src={m.profiles.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
              <div>
                {m.profiles?.username ? (
                  <Link href={`/profile/${m.profiles.username}`} className="text-sm font-medium hover:text-indigo">{m.profiles.full_name ?? m.profiles.username}</Link>
                ) : (
                  <span className="text-sm">{m.profiles?.full_name ?? "User"}</span>
                )}
                {m.role === "admin" && <span className="ml-2 rounded bg-amber/20 px-1.5 py-0.5 text-xs text-amber">Admin</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {events && events.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {(events as EventRow[]).map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} className="card block p-4">
                <span className="text-xs text-amber">{e.type}</span>
                <h3 className="mt-1 font-semibold">{e.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{new Date(e.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
