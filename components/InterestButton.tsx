"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function InterestButton({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const [interested, setInterested] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("event_interests").select("id").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
      if (data) setInterested(true);
    })();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    if (!userId) return;
    if (interested) {
      await supabase.from("event_interests").delete().eq("event_id", eventId).eq("user_id", userId);
      setInterested(false);
    } else {
      await supabase.from("event_interests").insert({ event_id: eventId, user_id: userId });
      setInterested(true);
    }
  }

  if (!userId) return null;
  return (
    <button onClick={toggle} className={interested ? "btn bg-indigo/20 text-indigo text-sm" : "btn-primary text-sm"}>
      {interested ? "★ Interested" : "☆ Mark interested"}
    </button>
  );
}
