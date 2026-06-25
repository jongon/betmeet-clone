import { NextResponse } from "next/server";
import { renderAuthEmail } from "@/features/email/services/render-auth-email";
import { verifyHookSignature } from "@/features/email/services/verify-hook";
import { getEmailFrom, getResendClient } from "@/lib/email/client";

export const runtime = "nodejs";

/**
 * Supabase Send Email Hook endpoint (Unit 72). Supabase still mints the user and
 * token_hash, then POSTs the email payload here instead of sending it itself; we
 * render the template and deliver via Resend. The Custom SMTP on Supabase is
 * disabled (supabase/config.toml), so this is now the only sender.
 *
 * Auth: Standard Webhooks signature (SEND_EMAIL_HOOK_SECRET). Invalid → 401.
 * A 5xx tells Supabase to retry; a 2xx acks.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: ReturnType<typeof verifyHookSignature>;
  try {
    payload = verifyHookSignature(rawBody, request.headers);
  } catch (error) {
    console.error("[auth/email-hook] signature verification failed", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = renderAuthEmail(payload);
  if (!email) {
    // Action type the app does not use — ack so Supabase does not retry.
    return NextResponse.json({});
  }

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email.to,
      subject: email.subject,
      html: email.html,
    });
    if (error) {
      console.error("[auth/email-hook] resend error", error);
      return NextResponse.json({ error: "send_failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("[auth/email-hook] unhandled send error", error);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({});
}
