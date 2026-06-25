import { ctaBlock, emailShell } from "./shell";

// Password recovery (Unit 72). Ported from supabase/templates/recovery.html.

export interface RecoveryVars {
  confirmUrl: string;
  siteUrl: string;
}

export function renderRecoveryEmail({ confirmUrl, siteUrl }: RecoveryVars): {
  subject: string;
  html: string;
} {
  const contentHtml = `                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;">Haz clic en el botón para elegir una nueva contraseña:</p>
${ctaBlock(confirmUrl, "Restablecer contraseña")}`;

  return {
    subject: "Restablece tu contraseña — Quiniela Mundial 2026",
    html: emailShell({
      title: "Restablece tu contraseña",
      heading: "Restablece tu contraseña",
      contentHtml,
      footnote:
        "Si no solicitaste este cambio, ignora este correo: tu contraseña seguirá siendo la misma. El enlace expira pronto por seguridad.",
      siteUrl,
    }),
  };
}
