import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client backed by the service_role key.
 *
 * SECURITY (Unit 12 / FR-REFINE-12.3): this client bypasses RLS and can mutate
 * `auth.users`. It MUST only be used from server-side code (this module is only
 * imported by `"use server"` actions). The runtime guard below turns any accidental
 * browser execution into an immediate error. Never expose
 * `SUPABASE_SERVICE_ROLE_KEY` to the browser.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must never run in the browser");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service_role environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
