import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/auth", "/onboarding"];
const AUTH_ROUTES = ["/auth"];
const ONBOARDING_ROUTE = "/onboarding/profile";

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated users can only access public routes
  if (!user && !isPublic(pathname)) {
    const response = NextResponse.redirect(new URL("/auth/sign-in", request.url));
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

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
