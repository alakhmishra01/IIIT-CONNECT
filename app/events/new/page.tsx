"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COLLEGES, EVENT_TYPES } from "@/lib/colleges";
import type { Profile, Club } from "@/lib/types";

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>(EVENT_TYPES[0]);
  const [eventDate, setEventDate] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [openToOutsiders, setOpenToOutsiders] = useState(false);
  const [clubId, setClubId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) setProfile(p as Profile);
      const { data: cm } = await supabase.from("club_members").select("club_id").eq("user_id", user.id);
      if (cm?.length) {
        const clubIds = cm.map((m) => m.club_id);
        const { data: c } = await supabase.from("clubs").select("*").in("id", clubIds).eq("status", "approved");
        if (c) setClubs(c as Club[]);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase.from("events").insert({
      title, description: description || null, type,
      college_slug: profile.college_slug,
      event_date: new Date(eventDate).toISOString(),
      registration_link: registrationLink || null,
      open_to_outsiders: openToOutsiders,
      posted_by: profile.id,
      club_id: clubId || null,
    });
    setLoading(false);
    if (error) setMsg(error.message);
    else { router.push("/events"); router.refresh(); }
  }

  if (!profile) return <p className="text-slate-400">Loading…</p>;
  if (profile.verification_status !== "verified") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Verification required</h1>
        <p className="mt-3 text-slate-400">Only verified students can post events. Your status: <span className="text-amber">{profile.verification_status}</span></p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Post a new event</h1>
      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Event title</label>
          <input id="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="desc">Description</label>
          <textarea id="desc" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="type">Type</label>
            <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="date">Date & time</label>
            <input id="date" type="datetime-local" required className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
        </div>
        {clubs.length > 0 && (
          <div>
            <label className="label" htmlFor="club">Post as club (optional)</label>
            <select id="club" className="input" value={clubId} onChange={(e) => setClubId(e.target.value)}>
              <option value="">Personal event</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="link">Registration link (optional)</label>
          <input id="link" className="input" value={registrationLink} onChange={(e) => setRegistrationLink(e.target.value)} placeholder="https://..." />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={openToOutsiders} onChange={(e) => setOpenToOutsiders(e.target.checked)} />
          Open to students from other IIITs
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? "Posting…" : "Post event"}
        </button>
        {msg && <p className="text-sm text-red-400">{msg}</p>}
      </form>
    </div>
  );
}
