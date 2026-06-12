import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COLLEGES, CLUB_TYPES, getCollege } from "@/lib/colleges";
import type { Club } from "@/lib/types";
import ClubFilters from "@/components/ClubFilters";

export const revalidate = 300;
export const metadata = { title: "Clubs & Societies — IIIT Connect" };

export default async function ClubsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("clubs").select("*").eq("status", "approved").order("name");
  return <ClubFilters clubs={(data ?? []) as Club[]} />;
}
