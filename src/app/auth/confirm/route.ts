import { type NextRequest, NextResponse } from "next/server";
import { handleGoogleCallback } from "@/features/auth/actions/google-callback";
import { prisma } from "@/lib/prisma";
import { sanitizeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

// Email-link OTP types we accept. Mirrors Supabase's EmailOtpType union.
const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;
type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Server-side email confirmation via token_hash + verifyOtp.
 *
 * Unlike /auth/callback (PKCE `exchangeCodeForSession`), this flow does NOT depend
 * on the code-verifier cookie, so it survives links opened cross-device or rewritten
 * by mail scanners (Outlook SafeLinks). Email templates link here with
 * `?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = sanitizeNext(searchParams.get("next"));

  if (!tokenHash || !isEmailOtpType(type)) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_token`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/sign-in?error=verify_failed`);
  }

  // Keep parity with /auth/callback: sync Google avatar when applicable.
  if (data.session.user.app_metadata.provider === "google") {
    await handleGoogleCallback(data.session.user.id);
  }

  const profile = await prisma.profile.findUnique({
    where: { id: data.session.user.id },
    select: { onboardingCompleted: true },
  });
  const destination = profile?.onboardingCompleted
    ? next
    : `/onboarding/profile?next=${encodeURIComponent(next)}`;

  return NextResponse.redirect(`${origin}${destination}`);
}
