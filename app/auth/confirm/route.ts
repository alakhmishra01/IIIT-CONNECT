import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { detectCollegeFromEmail } from "@/lib/colleges";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "email" | "recovery" | "invite" | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  // Handle token_hash flow (email confirmation link)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      // Get the now-authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const college = detectCollegeFromEmail(user.email);
        const service = createServiceClient();
        await service.from("profiles").update({
          college_slug: college?.slug ?? null,
          verification_status: college ? "verified" : "unverified",
          is_alumni: false,
        }).eq("id", user.id);
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Handle code flow (OAuth / PKCE)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      const college = detectCollegeFromEmail(data.user.email);
      const service = createServiceClient();
      await service.from("profiles").update({
        college_slug: college?.slug ?? null,
        verification_status: college ? "verified" : "unverified",
        is_alumni: false,
      }).eq("id", data.user.id);
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation-failed`);
}
