// Brand email shell (Unit 72). Ported verbatim from supabase/templates/*.html so
// the migrated emails keep the exact same look. Templates used to be hosted and
// rendered by Supabase; now they render here and ship via Resend.

const BRAND = "Quiniela Mundial 2026";

/** Minimal HTML-escape for interpolated, user-controlled text (e.g. emails). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailShellOptions {
  title: string;
  heading: string;
  /** Inner HTML of the main content cell (already escaped where needed). */
  contentHtml: string;
  /** Footer disclaimer line. */
  footnote: string;
  siteUrl: string;
}

export function emailShell({
  title,
  heading,
  contentHtml,
  footnote,
  siteUrl,
}: EmailShellOptions): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#fafaf7;font-family:'Barlow Semi Condensed',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b1220;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8e6;">
            <tr>
              <td style="background-color:#0f9e58;padding:28px 32px;">
                <span style="display:inline-block;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f5a524;">⚽ ${BRAND}</span>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;">${escapeHtml(heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8e6;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">${escapeHtml(footnote)}</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">${BRAND} · <a href="${siteUrl}" style="color:#94a3b8;">${siteUrl}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A primary CTA button + plain-link fallback, identical to the original templates. */
export function ctaBlock(url: string, label: string): string {
  return `                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" style="border-radius:10px;background-color:#0f9e58;">
                      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 8px;font-size:13px;line-height:1.6;color:#64748b;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${url}" style="color:#0f9e58;">${url}</a></p>`;
}
