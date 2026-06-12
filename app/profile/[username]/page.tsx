import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCollege } from "@/lib/colleges";
import type { Profile } from "@/lib/types";

export const revalidate = 300;

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).single();
  if (!profile) notFound();
  const p = profile as Profile;
  const college = p.college_slug ? getCollege(p.college_slug) : null;

  // Get their clubs
  const { data: memberships } = await supabase
    .from("club_members")
    .select("role, clubs(name, slug, type)")
    .eq("user_id", p.id);

  // Get their recent answers count
  const { count: answerCount } = await supabase
    .from("answers")
    .select("*", { count: "exact", head: true })
    .eq("answered_by", p.id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6">
        <div className="flex items-start gap-5">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo/20 text-2xl font-bold text-indigo">
              {(p.full_name ?? p.username ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{p.full_name ?? p.username}</h1>
            <p className="text-sm text-slate-400">@{p.username}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {college && <span className="rounded bg-indigo/20 px-2 py-0.5 text-indigo">{college.name}</span>}
              {p.branch && <span className="text-slate-400">{p.branch}</span>}
              {p.graduation_year && <span className="text-slate-400">Class of {p.graduation_year}</span>}
              {p.is_alumni && <span className="rounded bg-amber/20 px-2 py-0.5 text-amber">Alumni</span>}
              {p.verification_status === "verified" && <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">✓ Verified</span>}
            </div>
          </div>
        </div>

        {p.bio && <p className="mt-4 text-slate-300">{p.bio}</p>}

        <div className="mt-4 flex gap-4">
          {p.linkedin_url && (
            <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo hover:underline">LinkedIn</a>
          )}
          {p.instagram_url && (
            <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo hover:underline">Instagram</a>
          )}
        </div>

        <div className="mt-6 flex gap-6 border-t border-white/10 pt-4 text-center text-sm">
          <div>
            <div className="font-heading text-lg font-bold text-amber">{answerCount ?? 0}</div>
            <div className="text-slate-400">Answers</div>
          </div>
          <div>
            <div className="font-heading text-lg font-bold text-amber">{memberships?.length ?? 0}</div>
            <div className="text-slate-400">Clubs</div>
          </div>
        </div>
      </div>

      {memberships && memberships.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold">Clubs</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {memberships.map((m: any) => (
              <Link key={m.clubs?.slug} href={`/clubs/${m.clubs?.slug}`} className="card px-4 py-2 text-sm">
                {m.clubs?.name}
                {m.role === "admin" && <span className="ml-1 text-xs text-amber">(Admin)</span>}
                <span className="ml-1 text-slate-500">· {m.clubs?.type}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
