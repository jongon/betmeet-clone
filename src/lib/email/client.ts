import { Resend } from "resend";

// Server-only Resend client (Unit 72). Replaces Supabase's Custom SMTP as the
// real email sender: the app now renders and sends transactional mail directly.
// Guarded so a bundling mistake never ships the API key to the browser.

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (typeof window !== "undefined") {
    throw new Error("Resend client must only be used on the server");
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

// Sender identity. Dev falls back to the Resend sandbox; prod must set a
// verified domain (DKIM/SPF/DMARC) in EMAIL_FROM. Mirrors Unit 9 §5.
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "Quiniela Mundial 2026 <onboarding@resend.dev>";
}
