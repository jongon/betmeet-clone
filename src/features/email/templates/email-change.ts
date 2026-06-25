import { ctaBlock, emailShell, escapeHtml } from "./shell";

// Email change confirmation (Unit 72). Ported from supabase/templates/email_change.html.
// With Secure email change DISABLED (FR-REFINE-19.1 / CF-9) the single link is
// sent only to the NEW address.

export interface EmailChangeVars {
  confirmUrl: string;
  siteUrl: string;
  oldEmail: string;
  newEmail: string;
}

export function renderEmailChangeEmail({
  confirmUrl,
  siteUrl,
  oldEmail,
  newEmail,
}: EmailChangeVars): { subject: string; html: string } {
  const contentHtml = `                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Recibimos una solicitud para cambiar la dirección de correo de tu cuenta:</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
                  <tr>
                    <td style="padding:12px 16px;background-color:#f8fafc;border-radius:8px;font-size:14px;color:#475569;">
                      De <strong style="color:#0b1220;">${escapeHtml(oldEmail)}</strong><br />
                      A <strong style="color:#0f9e58;">${escapeHtml(newEmail)}</strong>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;">Confirma el cambio haciendo clic en el botón:</p>
${ctaBlock(confirmUrl, "Confirmar cambio")}`;

  return {
    subject: "Confirma el cambio de tu email — Quiniela Mundial 2026",
    html: emailShell({
      title: "Confirma el cambio de tu email",
      heading: "Confirma el cambio de email",
      contentHtml,
      footnote:
        "Si no solicitaste este cambio, ignora este correo y revisa la seguridad de tu cuenta. El cambio no se aplicará sin confirmación.",
      siteUrl,
    }),
  };
}
