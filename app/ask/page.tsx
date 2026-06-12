import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COLLEGES, TOPIC_TAGS, getCollege } from "@/lib/colleges";
import type { Question } from "@/lib/types";
import QuestionFilters from "@/components/QuestionFilters";

export const revalidate = 300;
export const metadata = { title: "Ask a Senior — IIIT Connect" };

export default async function AskPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(200);
  return <QuestionFilters questions={(data ?? []) as Question[]} />;
}
