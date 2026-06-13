"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { detectCollegeFromEmail } from "@/lib/colleges";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAlumni, setIsAlumni] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const college = detectCollegeFromEmail(email);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${location.origin}/auth/callback?alumni=${isAlumni}` },
    });
    setLoading(false);
    setMsg(error ? error.message : "Check your inbox and click the confirmation link.");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Join IIIT Connect</h1>
      <p className="mt-1 text-sm text-slate-400">Anyone can join. IIIT students get superpowers ⚡</p>
      <form onSubmit={handleSignup} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          {college && (
            <p className="mt-1 text-sm text-emerald-400">
              ✓ {college.name} detected — you&apos;ll get full access automatically
            </p>
          )}
          {email.includes("@") && !college && !isAlumni && (
            <p className="mt-1 text-sm text-slate-500">
              You can browse, ask questions & explore. Use a college email for full access.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {!college && email.includes("@") && (
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={isAlumni} onChange={(e) => setIsAlumni(e.target.checked)}
              className="rounded" />
            I&apos;m an IIIT alumni (manual verification, ~48h)
          </label>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center" aria-label="Sign up">
          {loading ? "Creating account…" : "Create account"}
        </button>
        {msg && <p className="text-sm text-amber">{msg}</p>}
        <p className="text-sm text-slate-400">Already have an account? <Link href="/auth/login" className="text-indigo">Sign in</Link></p>
      </form>

      <div className="mt-6 card p-5">
        <h3 className="font-heading text-sm font-semibold text-slate-300">What can you do?</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400">●</span>
            <span><span className="text-white">Everyone</span> — browse colleges, cutoffs, events, clubs & ask seniors questions</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-indigo">●</span>
            <span><span className="text-white">Verified students</span> — post events, register clubs, answer questions, upload photos & reviews</span>
          </div>
        </div>
      </div>
    </div>
  );
}
