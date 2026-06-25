import { ctaBlock, emailShell } from "./shell";

// Signup confirmation (Unit 72). Ported from supabase/templates/confirmation.html.
// Subject mirrors [auth.email.template.confirmation] in supabase/config.toml.

export interface ConfirmationVars {
  confirmUrl: string;
  siteUrl: string;
}

export function renderConfirmationEmail({ confirmUrl, siteUrl }: ConfirmationVars): {
  subject: string;
  html: string;
} {
  const contentHtml = `                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">¡Bienvenido! Estás a un paso de empezar a predecir el Mundial 2026 y competir con tus amigos.</p>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;">Confirma tu dirección de correo para activar tu cuenta:</p>
${ctaBlock(confirmUrl, "Confirmar mi cuenta")}`;

  return {
    subject: "Confirma tu cuenta — Quiniela Mundial 2026",
    html: emailShell({
      title: "Confirma tu cuenta",
      heading: "Confirma tu cuenta",
      contentHtml,
      footnote: "Si no creaste esta cuenta, puedes ignorar este correo de forma segura.",
      siteUrl,
    }),
  };
}
