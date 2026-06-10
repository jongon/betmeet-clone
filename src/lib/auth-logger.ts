type AuthEvent = "auth.sign_in_failed" | "auth.account_deleted";

interface AuthLogEntry {
  event: AuthEvent;
  userId: string | null;
  email: string;
  timestamp: string;
  reason?: string;
}

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
}
