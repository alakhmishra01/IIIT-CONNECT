"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else { router.push(next); router.refresh(); }
  }

  return (
    <form onSubmit={handleLogin} className="card mt-6 space-y-4 p-6">
      <div><label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <button type="submit" className="btn-primary w-full justify-center" aria-label="Sign in">Sign in</button>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <p className="text-sm text-slate-400">No account? <Link href="/auth/signup" className="text-indigo">Sign up</Link></p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
