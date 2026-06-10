"use server";

// Passkey sign-in is handled entirely client-side via the WebAuthn browser API
// (@simplewebauthn/browser + supabase MFA challenge/verify).
// These stubs are kept for future server-side integration if Supabase adds passkey
// sign-in as a first-class method (currently in beta as a separate auth flow).

import { logAuthEvent } from "@/lib/auth-logger";

export async function reportPasskeyFailure(reason: string) {
  logAuthEvent("auth.sign_in_failed", {
    method: "passkey",
    reason,
  });
}
