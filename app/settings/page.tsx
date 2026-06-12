"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setBranch(p.branch ?? "");
        setGradYear(p.graduation_year?.toString() ?? "");
        setBio(p.bio ?? "");
        setLinkedin(p.linkedin_url ?? "");
        setInstagram(p.instagram_url ?? "");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, branch,
      graduation_year: gradYear ? Number(gradYear) : null,
      bio: bio || null, linkedin_url: linkedin || null, instagram_url: instagram || null,
    }).eq("id", profile.id);
    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg("Saved!");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!profile) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="card mt-4 p-4 text-sm">
        <p className="text-slate-400">Username: <span className="text-white">@{profile.username}</span></p>
        <p className="text-slate-400">College: <span className="text-white">{profile.college_slug ?? "Not set"}</span></p>
        <p className="text-slate-400">Status: <span className={profile.verification_status === "verified" ? "text-emerald-400" : "text-amber"}>{profile.verification_status}</span></p>
      </div>
      <form onSubmit={handleSave} className="card mt-4 space-y-4 p-6">
        <div><label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="branch">Branch</label>
            <input id="branch" className="input" value={branch} onChange={(e) => setBranch(e.target.value)} /></div>
          <div><label className="label" htmlFor="year">Graduation year</label>
            <input id="year" type="number" className="input" value={gradYear} onChange={(e) => setGradYear(e.target.value)} /></div>
        </div>
        <div><label className="label" htmlFor="bio">Bio</label>
          <textarea id="bio" className="input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        <div><label className="label" htmlFor="li">LinkedIn URL</label>
          <input id="li" className="input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></div>
        <div><label className="label" htmlFor="ig">Instagram URL</label>
          <input id="ig" className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} /></div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? "Saving…" : "Save changes"}
        </button>
        {msg && <p className={`text-sm ${msg === "Saved!" ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
      </form>
      <button onClick={handleSignOut} className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20">
        Sign out
      </button>
    </div>
  );
}
