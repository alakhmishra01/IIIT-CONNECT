"use client";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { CATEGORIES } from "@/lib/colleges";
import type { CutoffData } from "@/lib/types";

export default function CutoffChart({ data }: { data: CutoffData }) {
  const [branch, setBranch] = useState(data.branches[0]?.code ?? "");
  const [category, setCategory] = useState<string>("OPEN");

  const points = useMemo(() => {
    const b = data.branches.find((x) => x.code === branch);
    if (!b) return [];
    const byYear = new Map<number, { year: number; opening: number; closing: number }>();
    for (const r of b.rounds.filter((r) => r.category === category)) {
      const existing = byYear.get(r.year);
      if (!existing || r.round > 0) byYear.set(r.year, { year: r.year, opening: r.opening, closing: r.closing });
    }
    return [...byYear.values()].sort((a, b2) => a.year - b2.year);
  }, [data, branch, category]);

  return (
    <div className="card mt-4 p-4">
      <div className="mb-4 flex flex-wrap gap-3">
        <select aria-label="Branch" className="input max-w-xs" value={branch} onChange={(e) => setBranch(e.target.value)}>
          {data.branches.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
        <select aria-label="Category" className="input max-w-[160px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {points.length ? (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={points}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="year" stroke="#94A3B8" />
            <YAxis reversed stroke="#94A3B8" label={{ value: "Rank (lower = better)", angle: -90, position: "insideLeft", fill: "#94A3B8" }} />
            <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)" }} />
            <Legend />
            <Line type="monotone" dataKey="closing" name="Closing rank" stroke="#6366F1" strokeWidth={2} />
            <Line type="monotone" dataKey="opening" name="Opening rank" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 4" />
          </LineChart>
        </ResponsiveContainer>
      ) : <p className="text-sm text-slate-500">No data for this branch/category yet.</p>}
    </div>
  );
}
