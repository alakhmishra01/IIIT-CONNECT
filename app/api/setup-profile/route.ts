import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { detectCollegeFromEmail } from "@/lib/colleges";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if already verified
  const { data: profile } = await supabase.from("profiles").select("verification_status, college_slug").eq("id", user.id).single();
  if (profile?.verification_status === "verified" && profile?.college_slug) {
    return NextResponse.json({ status: "already_verified", college_slug: profile.college_slug });
  }

  // Detect college from email and update via service role
  const college = detectCollegeFromEmail(user.email);
  const service = createServiceClient();

  await service.from("profiles").update({
    college_slug: college?.slug ?? null,
    verification_status: college ? "verified" : "unverified",
  }).eq("id", user.id);

  return NextResponse.json({
    status: college ? "verified" : "unverified",
    college_slug: college?.slug ?? null,
  });
}
