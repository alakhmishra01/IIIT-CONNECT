import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { detectCollegeFromEmail } from "@/lib/colleges";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const isAlumni = searchParams.get("alumni") === "true";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      const college = detectCollegeFromEmail(data.user.email);
      const service = createServiceClient();

      // College email → auto-verified
      // Alumni checkbox → pending manual review
      // Regular email → unverified (can still browse & ask questions)
      let verification_status: string;
      if (college) {
        verification_status = "verified";
      } else if (isAlumni) {
        verification_status = "pending";
      } else {
        verification_status = "unverified";
      }

      await service.from("profiles").update({
        college_slug: college?.slug ?? null,
        verification_status,
        is_alumni: isAlumni,
      }).eq("id", data.user.id);

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
