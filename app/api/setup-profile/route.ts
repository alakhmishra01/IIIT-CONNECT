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

  const college = detectCollegeFromEmail(user.email);
  const service = createServiceClient();

  // Upsert — creates the profile if it doesn't exist, updates if it does
  const { error } = await service.from("profiles").upsert({
    id: user.id,
    college_slug: college?.slug ?? null,
    verification_status: college ? "verified" : "unverified",
  }, {
    onConflict: "id",
    ignoreDuplicates: false,
  });

  return NextResponse.json({
    status: college ? "verified" : "unverified",
    college_slug: college?.slug ?? null,
    error: error?.message ?? null,
  });
}
