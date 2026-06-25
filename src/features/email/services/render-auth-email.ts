import { renderConfirmationEmail } from "../templates/confirmation";
import { renderEmailChangeEmail } from "../templates/email-change";
import { renderRecoveryEmail } from "../templates/recovery";
import type { AuthEmailActionType, RenderedEmail, SendEmailHookPayload } from "../types";

// Maps a Supabase Send Email Hook payload to a rendered Resend email (Unit 72).
//
// Link construction mirrors the original supabase/templates/*.html exactly so the
// active token_hash flow keeps resolving through /auth/confirm (verifyOtp) — see
// src/app/auth/confirm/route.ts. We deliberately do NOT change that flow.

const DEFAULT_NEXT = encodeURIComponent("/matches");

/** Build the /auth/confirm link. `next` is appended raw to mirror the templates
 * (invite_next arrives already percent-encoded from sign-up.ts). */
function confirmUrl(siteUrl: string, tokenHash: string, type: string, next: string): string {
  return `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=${type}&next=${next}`;
}

function resolveSiteUrl(payload: SendEmailHookPayload): string {
  return payload.email_data.site_url || process.env.NEXT_PUBLIC_SITE_URL || "";
}

/** invite_next is stored percent-encoded in user_metadata by sign-up.ts
 * (FR-REFINE-13.1). Fall back to the encoded /matches default. */
function signupNext(payload: SendEmailHookPayload): string {
  const inviteNext = payload.user.user_metadata?.invite_next;
  return typeof inviteNext === "string" && inviteNext.length > 0 ? inviteNext : DEFAULT_NEXT;
}

/**
 * Returns the email to send, or `null` if the action type is one the app does not
 * use (the hook acks so Supabase does not retry). The three active auth emails —
 * signup, recovery, email_change — are always handled.
 */
export function renderAuthEmail(payload: SendEmailHookPayload): RenderedEmail | null {
  const { user, email_data } = payload;
  const siteUrl = resolveSiteUrl(payload);
  const tokenHash = email_data.token_hash;
  const action: AuthEmailActionType = email_data.email_action_type;

  switch (action) {
    case "signup": {
      if (!user.email) return null;
      const { subject, html } = renderConfirmationEmail({
        confirmUrl: confirmUrl(siteUrl, tokenHash, "signup", signupNext(payload)),
        siteUrl,
      });
      return { to: user.email, subject, html };
    }
    case "recovery": {
      if (!user.email) return null;
      const { subject, html } = renderRecoveryEmail({
        confirmUrl: confirmUrl(siteUrl, tokenHash, "recovery", "/reset-password"),
        siteUrl,
      });
      return { to: user.email, subject, html };
    }
    // Secure email change is DISABLED (CF-9): a single link goes to the NEW address.
    case "email_change":
    case "email_change_new": {
      const newEmail = user.new_email ?? user.email;
      if (!newEmail) return null;
      const { subject, html } = renderEmailChangeEmail({
        confirmUrl: confirmUrl(siteUrl, tokenHash, "email_change", "/settings/security"),
        siteUrl,
        oldEmail: user.email ?? "",
        newEmail,
      });
      return { to: newEmail, subject, html };
    }
    // Action types the app does not trigger today (magiclink, invite,
    // email_change_current, reauthentication) — nothing to send.
    default:
      return null;
  }
}
