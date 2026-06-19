import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
  "/auth/confirm",
  "/onboarding",
  // "/rules" is intentionally NOT public: the Rules Center requires a session
  // (BR-2.10). An unauthenticated visit to /rules redirects to /sign-in via the
  // unauthenticated-user guard below.
];

const AUTH_ONLY_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  // "/reset-password" is intentionally NOT auth-only: the password-recovery flow
  // arrives here *with* an active (recovery) session after /auth/callback exchanges
  // the code. Treating it as auth-only would bounce that session to /matches before
  // the user can set a new password.
  "/verify-email",
];

const ONBOARDING_ROUTE = "/onboarding/profile";
const VERIFY_EMAIL_ROUTE = "/verify-email";

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthOnly(pathname: string) {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
  // API routes authenticate themselves (e.g. the `x-sync-secret` guard on
  // /api/cron/sync and /api/notifications/dispatch, or browser-posted CSP
  // reports). The session-cookie redirect flow below would otherwise bounce
  // these server-to-server / sessionless calls to /sign-in (307), so the route
  // handler — and its own guard — never runs.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Verify the JWT LOCALLY via asymmetric signing keys (no round-trip to the
  // Auth server). A Custom Access Token Hook carries the gates we need as claims:
  // `email_verified` and `onboarding_completed` (email_confirmed_at and the
  // profile flag are not standard JWT claims) — see
  // prisma/migrations/20260617120000_auth_access_token_hook.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsError ? null : (claimsData?.claims ?? null);
  const record = claims as Record<string, unknown> | null;
  const isAuthenticated = typeof record?.sub === "string";

  const { pathname, search } = request.nextUrl;
  // Original destination to return to after auth/onboarding (FR-REFINE-13.1/13.2).
  const intendedPath = `${pathname}${search}`;

  // A session whose email is not yet confirmed must not reach the app
  // (FR-REFINE-15.14). Gate only on an EXPLICIT `email_verified === false`: a
  // missing claim (e.g. a token minted before the Custom Access Token Hook was
  // enabled, still valid until it refreshes) fails OPEN so existing sessions are
  // not bounced en masse on deploy. Such tokens belong to users who already had
  // a session, which requires a confirmed email to begin with.
  const emailConfirmed = !isAuthenticated || record?.email_verified !== false;

  // Unauthenticated users can only access public routes
  if (!isAuthenticated && !isPublic(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserve the intended destination (e.g. an invite link) so the user returns
    // to it after signing in (FR-REFINE-13.1).
    signInUrl.searchParams.set("next", intendedPath);
    const response = NextResponse.redirect(signInUrl);
    response.cookies.set("session_expired", "1", { maxAge: 10, path: "/" });
    return response;
  }

  // Authenticated but unconfirmed: force the verify-email page (which offers
  // resend / change-email). Public routes — including /verify-email itself,
  // /auth/confirm and /auth/callback — are left reachable so confirmation can
  // complete (FR-REFINE-15.14).
  if (isAuthenticated && !emailConfirmed) {
    if (!isPublic(pathname)) {
      return NextResponse.redirect(new URL(VERIFY_EMAIL_ROUTE, request.url));
    }
    return supabaseResponse;
  }

  // Redirect confirmed users away from auth-only pages — UNLESS they still owe a
  // second factor. After password login an MFA user holds an aal1 session (so
  // `getUser` returns a user) but must complete the TOTP challenge, which runs on
  // /sign-in via server actions (getMfaFactors / verifyMfa). Bouncing them to
  // /matches here turns those action POSTs into redirects, surfacing as an
  // "unexpected response" error and blocking sign-in. Let aal1-pending users stay.
  if (isAuthenticated && isAuthOnly(pathname)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const mfaPending = aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel;
    if (!mfaPending) {
      return NextResponse.redirect(new URL("/matches", request.url));
    }
  }

  // Confirmed users who have not finished onboarding are gated to it, using the
  // `onboarding_completed` claim injected by the Custom Access Token Hook
  // (FR-REFINE-15.13). The hook emits an EXPLICIT false for a new user (profile
  // missing or flag false), so new users are gated; the onboarding page
  // self-heals a missing profile via Prisma. Completing onboarding refreshes the
  // token (completeOnboarding → refreshSession) so this gate clears immediately.
  // A MISSING claim (token minted before the hook existed) fails OPEN to avoid
  // bouncing existing sessions on deploy; the action layer (getOnboardedUserId,
  // Prisma) is the authoritative defense-in-depth check for mutations.
  if (isAuthenticated && !isPublic(pathname) && pathname !== ONBOARDING_ROUTE) {
    if (record?.onboarding_completed === false) {
      const onboardingUrl = new URL(ONBOARDING_ROUTE, request.url);
      // Continue to the intended destination once onboarding completes
      // (FR-REFINE-13.2 / 12.7).
      onboardingUrl.searchParams.set("next", intendedPath);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
