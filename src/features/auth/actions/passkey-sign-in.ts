"use server";

// Passkey sign-in runs client-side via supabase.auth.signInWithPasskey()
// (Supabase Passkeys beta). This server action only records failure telemetry.

import { logAuthEvent } from "@/lib/auth-logger";

export async function reportPasskeyFailure(reason: string) {
  logAuthEvent("auth.sign_in_failed", {
    method: "passkey",
    reason,
  });
}
