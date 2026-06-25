import { getEmailFrom, getResendClient } from "@/lib/email/client";
import { ctaBlock, emailShell } from "../templates/shell";
import type { RenderedEmail } from "../types";

// Group B — business / notification emails (Unit 72 scaffolding).
//
// These are NOT wired to any trigger yet. They exist so the Resend channel built
// for auth mail can be reused for the engagement catalog proposed in Unit 9 §4
// (pool invites, welcome, kickoff reminders, scoring digest...). Activating any of
// them requires per-user notification preferences (opt-in/opt-out) first — see
// FR-04 / UC-08 — and, for cron-driven ones, a job entry point. Keep them here as
// pure builders until a unit turns them on.

export type BusinessEmailType = "welcome" | "pool-invite";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

/** Email #4 — Welcome (post-verification). */
export function buildWelcomeEmail(to: string): RenderedEmail {
  const url = siteUrl();
  return {
    to,
    subject: "¡Bienvenido a Quiniela Mundial 2026!",
    html: emailShell({
      title: "Bienvenido",
      heading: "¡Tu cuenta está lista!",
      contentHtml: `                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;">Ya puedes crear o unirte a una liga y empezar a predecir los partidos del Mundial 2026.</p>
${ctaBlock(`${url}/matches`, "Ir a predecir")}`,
      footnote: "Recibes este correo porque te registraste en Quiniela Mundial 2026.",
      siteUrl: url,
    }),
  };
}

/** Email #5 — Pool invitation (token link). */
export function buildPoolInviteEmail(
  to: string,
  poolName: string,
  inviteUrl: string,
): RenderedEmail {
  const url = siteUrl();
  return {
    to,
    subject: `Te invitaron a la liga "${poolName}" — Quiniela Mundial 2026`,
    html: emailShell({
      title: "Invitación a una liga",
      heading: "Te invitaron a una liga",
      contentHtml: `                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;">Te invitaron a unirte a la liga <strong>${poolName}</strong>. Acepta la invitación para competir:</p>
${ctaBlock(inviteUrl, "Unirme a la liga")}`,
      footnote: "Si no esperabas esta invitación, puedes ignorar este correo.",
      siteUrl: url,
    }),
  };
}

/** Best-effort sender for business emails. Wire-up pending per-unit activation. */
export async function sendBusinessEmail(email: RenderedEmail): Promise<{ ok: boolean }> {
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email.to,
      subject: email.subject,
      html: email.html,
    });
    if (error) {
      console.error("[email/catalog] resend error", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.error("[email/catalog] send failed", error);
    return { ok: false };
  }
}
