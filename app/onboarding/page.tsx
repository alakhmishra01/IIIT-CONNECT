"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const local = data.user?.email?.split("@")[0] ?? "";
      setUsername(local.replace(/[^a-z0-9.]/gi, "-").toLowerCase());
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!username) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const { count } = await supabase.from("profiles")
        .select("*", { count: "exact", head: true }).eq("username", username);
      setAvailable(count === 0);
    }, 400);
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (available === false) { setMsg("Username taken."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Ensure profile row exists and college is verified
    await fetch("/api/setup-profile", { method: "POST" });
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username, full_name: fullName, branch,
      graduation_year: gradYear ? Number(gradYear) : null,
      bio: bio || null, linkedin_url: linkedin || null, instagram_url: instagram || null,
    });
    if (error) setMsg(error.message);
    else { router.push(`/profile/${username}`); router.refresh(); }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Set up your profile</h1>
      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" required className="input" value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())} />
          {available === false && <p className="text-sm text-red-400">Taken</p>}
          {available === true && <p className="text-sm text-emerald-400">Available</p>}
        </div>
        <div><label className="label" htmlFor="name">Full name</label>
          <input id="name" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="branch">Branch</label>
            <input id="branch" className="input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" /></div>
          <div><label className="label" htmlFor="year">Graduation year</label>
            <input id="year" type="number" className="input" value={gradYear} onChange={(e) => setGradYear(e.target.value)} /></div>
        </div>
        <div><label className="label" htmlFor="bio">Bio (optional)</label>
          <textarea id="bio" className="input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        <div><label className="label" htmlFor="li">LinkedIn URL (optional)</label>
          <input id="li" className="input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></div>
        <div><label className="label" htmlFor="ig">Instagram URL (optional)</label>
          <input id="ig" className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} /></div>
        <button type="submit" className="btn-primary w-full justify-center" aria-label="Finish onboarding">Finish</button>
        {msg && <p className="text-sm text-red-400">{msg}</p>}
      </form>
    </div>
  );
}
