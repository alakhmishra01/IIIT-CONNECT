"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { COLLEGES, EVENT_TYPES } from "@/lib/colleges";
import type { EventRow } from "@/lib/types";

export default function EventFeed({ events }: { events: EventRow[] }) {
  const [college, setCollege] = useState("");
  const [type, setType] = useState("");
  const [outsidersOnly, setOutsidersOnly] = useState(false);

  const filtered = useMemo(() => events.filter((e) =>
    (!college || e.college_slug === college) &&
    (!type || e.type === type) &&
    (!outsidersOnly || e.open_to_outsiders)
  ), [events, college, type, outsidersOnly]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Events</h1>
        <Link href="/events/new" className="btn-cta text-sm">+ Post event</Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select aria-label="Filter by college" className="input max-w-[220px]" value={college} onChange={(e) => setCollege(e.target.value)}>
          <option value="">All colleges</option>
          {COLLEGES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Filter by type" className="input max-w-[180px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={outsidersOnly} onChange={(e) => setOutsidersOnly(e.target.checked)} />
          Open to other IIITs
        </label>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => {
          const c = COLLEGES.find((col) => col.slug === e.college_slug);
          return (
            <Link key={e.id} href={`/events/${e.id}`} className="card block p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber">{e.type}</span>
                {e.open_to_outsiders && <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">Open to all IIITs</span>}
              </div>
              <h2 className="mt-2 font-heading text-lg font-semibold">{e.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{c?.name}</p>
              <p className="mt-1 text-sm text-slate-400">{new Date(e.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
