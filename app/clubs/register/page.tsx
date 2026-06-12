"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CLUB_TYPES } from "@/lib/colleges";
import type { Profile } from "@/lib/types";

export default function RegisterClubPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<string>(CLUB_TYPES[0]);
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) setProfile(p as Profile);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }, [name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase.from("clubs").insert({
      name, slug, type,
      college_slug: profile.college_slug,
      description: description || null,
      created_by: profile.id,
    });
    setLoading(false);
    if (error) setMsg(error.message);
    else {
      setMsg(null);
      router.push("/clubs");
      router.refresh();
    }
  }

  if (!profile) return <p className="text-slate-400">Loading…</p>;
  if (profile.verification_status !== "verified") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Verification required</h1>
        <p className="mt-3 text-slate-400">Only verified students can register clubs. Your status: <span className="text-amber">{profile.verification_status}</span></p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Register a club</h1>
      <p className="mt-1 text-sm text-slate-400">Your club will be reviewed before it appears publicly.</p>
      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">Club name</label>
          <input id="name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="slug">URL slug</label>
          <input id="slug" required className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">/clubs/{slug || "…"}</p>
        </div>
        <div>
          <label className="label" htmlFor="type">Category</label>
          <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {CLUB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="desc">Description</label>
          <textarea id="desc" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? "Submitting…" : "Submit for review"}
        </button>
        {msg && <p className="text-sm text-red-400">{msg}</p>}
      </form>
    </div>
  );
}
