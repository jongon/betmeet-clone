type AuthEvent =
  | "auth.sign_in_failed"
  | "auth.sign_in_blocked_deleted"
  | "auth.account_deleted"
  | "auth.resend_confirmation_failed"
  | "auth.change_unconfirmed_email_failed"
  | "auth.change_unconfirmed_email_succeeded"
  | "admin.match_overridden"
  | "admin.override_reverted"
  | "admin.sync_triggered"
  | "pool.settings_changed";

export function redactEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex < 0) return "***";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  return `${local.slice(0, Math.min(3, local.length))}***${domain}`;
}

export function logAuthEvent(
  event: AuthEvent,
  payload: { userId?: string | null; email?: string; reason?: string; [key: string]: unknown },
): void {
  try {
    const { userId, email, reason, ...extra } = payload;
    const entry = {
      event,
      userId: userId ?? null,
      email: email ? redactEmail(email) : undefined,
      timestamp: new Date().toISOString(),
      reason,
      ...extra,
    };
    console.error(JSON.stringify(entry));
  } catch {
    // Silently drop malformed log entries to prevent disrupting the main flow.
  }
}
