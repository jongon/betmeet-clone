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
  "/onboarding",
  // "/rules" is intentionally NOT public: the Rules Center requires a session
  // (BR-2.10). An unauthenticated visit to /rules redirects to /sign-in via the
  // unauthenticated-user guard below.
];

const AUTH_ONLY_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
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

  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth-only pages
  if (user && isAuthOnly(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated users can only access public routes
  if (!user && !isPublic(pathname)) {
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.set("session_expired", "1", { maxAge: 10, path: "/" });
    return response;
  }

  // Authenticated users without a completed profile are gated to onboarding
  if (user && !isPublic(pathname) && pathname !== ONBOARDING_ROUTE) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname_base")
      .eq("id", user.id)
      .single();

    if (!profile?.nickname_base) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
    }
  }

  // Admin area: only ADMIN profiles may enter /admin/* (BR-7.1)
  if (user && pathname.startsWith("/admin")) {
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("id", user.id)
      .single();

    if (adminProfile?.verification_status !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
