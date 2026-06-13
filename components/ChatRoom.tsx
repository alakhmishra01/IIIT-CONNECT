"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getYearLevel, getYearLabel, isSenior } from "@/lib/seniority";
import type { Profile } from "@/lib/types";

interface ChatMessage {
  id: string;
  college_slug: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: { username: string | null; graduation_year: number | null } | null;
}

const YEAR_BADGE_COLORS: Record<number, string> = {
  1: "bg-slate-500/20 text-slate-300",
  2: "bg-blue-500/20 text-blue-400",
  3: "bg-amber/20 text-amber",
  4: "bg-indigo/20 text-indigo",
};

const COOLDOWN_SECONDS = 30;

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ChatRoom({ collegeSlug }: { collegeSlug: string }) {
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── Load user + status ──
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof as Profile);

      // Check mute status
      const { data: mute } = await supabase
        .from("muted_users")
        .select("muted_until")
        .eq("user_id", user.id)
        .eq("college_slug", collegeSlug)
        .gt("muted_until", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      if (mute) {
        setIsMuted(true);
        setMutedUntil(mute.muted_until);
      }

      // Check ban status
      const { data: ban } = await supabase
        .from("banned_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("college_slug", collegeSlug)
        .limit(1)
        .maybeSingle();
      if (ban) setIsBanned(true);
    }
    loadUser();
  }, [supabase, collegeSlug]);

  // ── Load initial messages ──
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles:sender_id(username, graduation_year)")
        .eq("college_slug", collegeSlug)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) {
        setMessages(data as ChatMessage[]);
        setTimeout(scrollToBottom, 100);
      }
    }
    loadMessages();
  }, [supabase, collegeSlug, scrollToBottom]);

  // ── Realtime subscription ──
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${collegeSlug}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `college_slug=eq.${collegeSlug}`,
        },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          // Fetch the sender profile for display
          const { data: prof } = await supabase
            .from("profiles")
            .select("username, graduation_year")
            .eq("id", msg.sender_id)
            .single();
          msg.profiles = prof;
          setMessages((prev) => [...prev, msg]);
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, collegeSlug, scrollToBottom]);

  // ── Cooldown timer ──
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  // ── Send message ──
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !currentUser || cooldown > 0 || isMuted || isBanned) return;

    setSending(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert({ college_slug: collegeSlug, sender_id: currentUser, body: body.trim() });

    setSending(false);
    if (insertError) {
      if (insertError.message.includes("policy")) {
        setError("Only verified students from this college can send messages.");
      } else {
        setError(insertError.message);
      }
    } else {
      setBody("");
      setCooldown(COOLDOWN_SECONDS);
    }
  }

  // ── Mute a user (senior action) ──
  async function handleMute(targetUserId: string) {
    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: muteError } = await supabase.from("muted_users").insert({
      user_id: targetUserId,
      college_slug: collegeSlug,
      muted_by: currentUser,
      muted_until: oneHourLater,
    });
    if (muteError) {
      setError(muteError.message);
    }
  }

  const currentYearLevel = profile ? getYearLevel(profile.graduation_year) : 0;
  const currentUserIsSenior = profile ? isSenior(profile.graduation_year) : false;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Muted banner */}
      {isMuted && (
        <div className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm text-amber">
          🔇 You are muted until{" "}
          {mutedUntil
            ? new Date(mutedUntil).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "later"}
          . You cannot send messages.
        </div>
      )}

      {/* Banned banner */}
      {isBanned && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          🚫 You have been banned from this college chat.
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">
            No messages yet. Be the first to say something!
          </p>
        )}
        {messages.map((msg) => {
          const yearLevel = msg.profiles?.graduation_year
            ? getYearLevel(msg.profiles.graduation_year)
            : 0;
          const yearLabel = getYearLabel(yearLevel);
          const badgeColor = YEAR_BADGE_COLORS[yearLevel] ?? "bg-slate-500/20 text-slate-400";
          const isOwnMessage = msg.sender_id === currentUser;
          const targetIsJunior = yearLevel > 0 && yearLevel < 3;

          return (
            <div
              key={msg.id}
              className={`group flex items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-white/5 ${
                isOwnMessage ? "bg-indigo/5" : ""
              }`}
            >
              {/* Avatar placeholder */}
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold uppercase text-slate-300">
                {msg.profiles?.username?.[0] ?? "?"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {msg.profiles?.username ?? "Anonymous"}
                  </span>
                  {yearLevel > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}>
                      {yearLabel}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500">{relativeTime(msg.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-300">{msg.body}</p>
              </div>

              {/* Mute button for seniors on junior messages */}
              {currentUserIsSenior && !isOwnMessage && targetIsJunior && (
                <button
                  onClick={() => handleMute(msg.sender_id)}
                  className="hidden rounded bg-amber/10 px-2 py-1 text-[10px] font-medium text-amber transition hover:bg-amber/20 group-hover:block"
                  title="Mute for 1 hour"
                >
                  Mute
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!currentUser ? (
        <p className="mt-3 text-center text-sm text-slate-500">
          Sign in to join the conversation.
        </p>
      ) : (
        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <input
            type="text"
            className="input"
            placeholder={
              isBanned
                ? "You are banned from this chat"
                : isMuted
                ? "You are currently muted"
                : "Type a message…"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isMuted || isBanned}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={sending || cooldown > 0 || isMuted || isBanned || !body.trim()}
            className="btn-primary whitespace-nowrap text-sm disabled:opacity-50"
          >
            {sending
              ? "Sending…"
              : cooldown > 0
              ? `Wait ${cooldown}s`
              : "Send"}
          </button>
        </form>
      )}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
