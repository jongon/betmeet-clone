// Shapes for the Supabase Send Email Hook (Unit 72). Supabase still authors the
// token/action; it POSTs this payload to /api/auth/email-hook and we render +
// send via Resend. See https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

export type AuthEmailActionType =
  | "signup"
  | "recovery"
  | "email_change"
  | "email_change_current"
  | "email_change_new"
  | "magiclink"
  | "invite"
  | "reauthentication";

export interface SendEmailHookUser {
  id: string;
  email?: string;
  /** Pending new address during an email change. */
  new_email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface SendEmailHookEmailData {
  token: string;
  token_hash: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to?: string;
  email_action_type: AuthEmailActionType;
  site_url?: string;
}

export interface SendEmailHookPayload {
  user: SendEmailHookUser;
  email_data: SendEmailHookEmailData;
}

/** A fully rendered email ready to hand to Resend. */
export interface RenderedEmail {
  to: string;
  subject: string;
  html: string;
}
