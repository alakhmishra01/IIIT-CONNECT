"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthButton() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ username: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase.from("profiles").select("username").eq("id", authUser.id).single();
        setUser({ username: data?.username ?? null });
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
        setUser({ username: data?.username ?? null });
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="h-8 w-16" />;

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-sm text-slate-300 hover:text-white">Settings</Link>
        {user.username && (
          <Link href={`/profile/${user.username}`} className="btn-primary !py-1.5 text-sm">
            @{user.username}
          </Link>
        )}
        {!user.username && (
          <Link href="/onboarding" className="btn-cta !py-1.5 text-sm">
            Complete profile
          </Link>
        )}
      </div>
    );
  }

  return (
    <Link href="/auth/login" className="btn-primary !py-1.5 text-sm">Sign in</Link>
  );
}
