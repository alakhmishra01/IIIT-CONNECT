"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { COLLEGES, CLUB_TYPES, getCollege } from "@/lib/colleges";
import type { Club } from "@/lib/types";

export default function ClubFilters({ clubs }: { clubs: Club[] }) {
  const [college, setCollege] = useState("");
  const [type, setType] = useState("");

  const filtered = useMemo(() => clubs.filter((c) =>
    (!college || c.college_slug === college) &&
    (!type || c.type === type)
  ), [clubs, college, type]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clubs & Societies</h1>
        <Link href="/clubs/register" className="btn-cta text-sm">+ Register club</Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select aria-label="Filter by college" className="input max-w-[220px]" value={college} onChange={(e) => setCollege(e.target.value)}>
          <option value="">All colleges</option>
          {COLLEGES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Filter by type" className="input max-w-[180px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {CLUB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const col = getCollege(c.college_slug);
          return (
            <Link key={c.id} href={`/clubs/${c.slug}`} className="card block p-5">
              <div className="flex items-center gap-3">
                {c.logo_url && <img src={c.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />}
                <div>
                  <h2 className="font-heading font-semibold">{c.name}</h2>
                  <p className="text-xs text-slate-400">{col?.name} · {c.type}</p>
                </div>
              </div>
              {c.description && <p className="mt-3 text-sm text-slate-300 line-clamp-2">{c.description}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
