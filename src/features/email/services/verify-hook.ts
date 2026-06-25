import { Webhook } from "standardwebhooks";
import type { SendEmailHookPayload } from "../types";

// Verifies the Supabase Send Email Hook signature (Unit 72) using the Standard
// Webhooks spec. The shared secret lives only in env (SEND_EMAIL_HOOK_SECRET) and
// matches the value configured on the Supabase hook. An invalid/missing signature
// must reject the request (the route returns 401).

export class HookVerificationError extends Error {}

const REQUIRED_HEADERS = ["webhook-id", "webhook-timestamp", "webhook-signature"] as const;

export function verifyHookSignature(rawBody: string, headers: Headers): SendEmailHookPayload {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    throw new HookVerificationError("SEND_EMAIL_HOOK_SECRET is not set");
  }

  const webhookHeaders: Record<string, string> = {};
  for (const name of REQUIRED_HEADERS) {
    const value = headers.get(name);
    if (!value) {
      throw new HookVerificationError(`Missing ${name} header`);
    }
    webhookHeaders[name] = value;
  }

  // Supabase prefixes the secret with `v1,whsec_`; standardwebhooks wants the
  // bare base64 value.
  const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));

  try {
    return wh.verify(rawBody, webhookHeaders) as SendEmailHookPayload;
  } catch (error) {
    throw new HookVerificationError(
      error instanceof Error ? error.message : "Signature verification failed",
    );
  }
}
