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

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthOnly(pathname: string) {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  // Original destination to return to after auth/onboarding (FR-REFINE-13.1/13.2).
  const intendedPath = `${pathname}${search}`;

  // Redirect authenticated users away from auth-only pages
  if (user && isAuthOnly(pathname)) {
    return NextResponse.redirect(new URL("/matches", request.url));
  }

  // Unauthenticated users can only access public routes
  if (!user && !isPublic(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserve the intended destination (e.g. an invite link) so the user returns
    // to it after signing in (FR-REFINE-13.1).
    signInUrl.searchParams.set("next", intendedPath);
    const response = NextResponse.redirect(signInUrl);
    response.cookies.set("session_expired", "1", { maxAge: 10, path: "/" });
    return response;
  }

  // Authenticated users without a completed profile are gated to onboarding
  if (user && !isPublic(pathname) && pathname !== ONBOARDING_ROUTE) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("nickname_base")
      .eq("id", user.id)
      .single();

    // Only gate to onboarding when we positively know the profile has no
    // nickname. If the read itself failed (e.g. PostgREST unavailable / schema
    // cache reloading), fail open instead of trapping every authenticated user
    // in an onboarding redirect loop.
    if (!error && !profile?.nickname_base) {
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
