"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { detectCollegeFromEmail } from "@/lib/colleges";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAlumni, setIsAlumni] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const college = detectCollegeFromEmail(email);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!isAlumni && !college) { setMsg("Use your college email, or select the alumni option."); return; }
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${location.origin}/auth/callback?alumni=${isAlumni}` },
    });
    setMsg(error ? error.message : "Check your inbox and click the confirmation link.");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <form onSubmit={handleSignup} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">College email</label>
          <input id="email" type="email" required className="input" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@iiitd.ac.in" />
          {college && <p className="mt-1 text-sm text-emerald-400">Detected: {college.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={isAlumni} onChange={(e) => setIsAlumni(e.target.checked)} />
          I'm an alumni without an active college email (manual verification, ~48h)
        </label>
        <button type="submit" className="btn-primary w-full justify-center" aria-label="Sign up">Sign up</button>
        {msg && <p className="text-sm text-amber">{msg}</p>}
      </form>
    </div>
  );
}
