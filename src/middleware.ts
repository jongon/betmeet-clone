import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	if (pathname === "/admin/login") {
		return NextResponse.next({ request: { headers: request.headers } });
	}

	const { response, user } = await updateSupabaseSession(request);

	if (!user) {
		const loginUrl = request.nextUrl.clone();
		loginUrl.pathname = "/admin/login";
		// The root path is no longer a destination — skip the `next` param so
		// the form lands on /admin by default. For /admin/* paths we preserve
		// the original route so the user returns there after authenticating.
		if (pathname !== "/") {
			loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
		}
		return NextResponse.redirect(loginUrl);
	}

	if (pathname === "/") {
		return NextResponse.redirect(new URL("/admin", request.url));
	}

	return response;
}

export const config = {
	matcher: ["/", "/admin/:path*"],
};
