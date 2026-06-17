import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient(cookieOptions?: Partial<CookieOptions>) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: { experimental: { passkey: true } },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, { ...options, ...cookieOptions });
          }
        } catch {
          // setAll called from a Server Component — cookies can't be set.
          // Middleware handles session refresh in this case.
        }
      },
    },
  });
}
