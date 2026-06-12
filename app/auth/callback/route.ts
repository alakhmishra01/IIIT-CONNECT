import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service"; // SERVER ONLY
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
      const service = createServiceClient(); // SERVER ONLY — never expose to client
      await service.from("profiles").update({
        college_slug: college?.slug ?? null,
        verification_status: college ? "verified" : isAlumni ? "pending" : "unverified",
        is_alumni: isAlumni,
      }).eq("id", data.user.id);
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
