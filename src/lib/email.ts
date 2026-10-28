/**
 * Sending email through Resend (https://resend.com), called over plain HTTPS so
 * there's no SDK to keep updated. Set RESEND_API_KEY and EMAIL_FROM to turn it
 * on; until then every email feature reports itself as unavailable and the rest
 * of the site works as before.
 */

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe for newsletters. */
  headers?: Record<string, string>;
};

export class EmailError extends Error {}

export async function sendEmail(email: Email): Promise<void> {
  if (!emailConfigured()) throw new EmailError("Email is not configured (RESEND_API_KEY / EMAIL_FROM)");
  // RESEND_API_URL only exists for local testing against a stand-in server.
  const res = await fetch(`${process.env.RESEND_API_URL?.trim() || "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM!.trim(), to: [email.to], subject: email.subject, html: email.html, text: email.text, headers: email.headers }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new EmailError(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/** Escape text for an HTML email. Everything from users or job ads goes through this. */
export const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * The shared look of every Fitwise email: plain, readable in any client, with
 * inline styles only (many email apps strip <style>). `body` must already be escaped HTML.
 */
export function emailLayout({ preheader, body, footer }: { preheader: string; body: string; footer: string }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#15171c">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 20px;font-size:20px;font-family:Georgia,serif"><span style="display:inline-block;width:26px;height:26px;line-height:26px;border-radius:13px;background:#1d6b52;color:#f5f3ee;text-align:center;font-size:14px;font-family:Arial,sans-serif;font-weight:bold;vertical-align:middle">f</span>&nbsp; Fitwise</td></tr>
<tr><td style="background:#ffffff;border:1px solid #dcd8cf;border-radius:16px;padding:28px 24px;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:20px 4px;font-size:12px;line-height:1.5;color:#5c6068">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

/** A big, tappable button that still works when images and styles are blocked. */
export const emailButton = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#15171c;color:#f5f3ee;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${esc(label)}</a>`;
