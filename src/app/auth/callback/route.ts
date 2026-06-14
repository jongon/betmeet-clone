import { type NextRequest, NextResponse } from "next/server";
import { handleGoogleCallback } from "@/features/auth/actions/google-callback";
import { syncProfileVerification } from "@/features/auth/services/sync-profile-verification";
import { prisma } from "@/lib/prisma";
import { sanitizeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));
  // Set by sign-up's emailRedirectTo to mark the account-confirmation flow.
  const isEmailConfirm = searchParams.get("flow") === "email_confirm";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=email_link_invalid`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    // For account confirmation the email is ALREADY confirmed at this point:
    // Supabase verifies the token and confirms the address before redirecting here
    // with the code; only the PKCE session exchange failed (link opened on another
    // device/browser, or pre-fetched by a mail scanner — the code-verifier cookie
    // isn't present). Reporting "couldn't confirm" is a false negative, so send the
    // user to sign in with an accurate, non-error message (FR-REFINE-16.8). The
    // robust root-cause fix is the token_hash flow (`/auth/confirm`) — see CF-7.
    if (isEmailConfirm) {
      return NextResponse.redirect(`${origin}/sign-in?confirmed=1`);
    }
    return NextResponse.redirect(`${origin}/sign-in?error=exchange_failed`);
  }

  // Sync Google avatar if applicable
  const provider = data.session.user.app_metadata.provider;
  if (provider === "google") {
    await handleGoogleCallback(data.session.user.id);
  }

  await syncProfileVerification(
    data.session.user.id,
    Boolean(data.session.user.email_confirmed_at),
  );

  const profile = await prisma.profile.findUnique({
    where: { id: data.session.user.id },
    select: { onboardingCompleted: true },
  });
  const destination = profile?.onboardingCompleted
    ? next
    : `/onboarding/profile?next=${encodeURIComponent(next)}`;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${destination}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${destination}`);
  } else {
    return NextResponse.redirect(`${origin}${destination}`);
  }
}
