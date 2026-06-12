import { createClient } from "@/lib/supabase/server";
import EventFeed from "@/components/EventFeed";
import type { EventRow } from "@/lib/types";

export const revalidate = 300;
export const metadata = { title: "Events across IIITs — IIIT Connect" };

export default async function EventsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*")
    .order("event_date", { ascending: true }).limit(200);
  return <EventFeed events={(data ?? []) as EventRow[]} />;
}
