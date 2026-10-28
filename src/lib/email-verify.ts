/**
 * Confirming an email address. Google sign-ins are confirmed by Google; password
 * sign-ups get a link. Only confirmed addresses receive job alerts, so typing
 * someone else's address at sign-up can't put them on a mailing list.
 */
import { sql } from "./db";
import { emailButton, emailLayout, esc, sendEmail } from "./email";
import { createEmailToken, spendToken } from "./email-tokens";
import type { Locale } from "@/i18n/config";

export const VERIFY_DAYS = 7;

const COPY = {
  en: {
    subject: "Confirm your email for Fitwise",
    pre: "One click and your weekly job matches can reach you.",
    hi: (n: string | null) => (n ? `Hi ${n},` : "Hi,"),
    body: "Confirm this is your email address and we'll send you the best new jobs for you once a week. You can turn that off any time.",
    button: "Confirm my email",
    expiry: `The link works for ${VERIFY_DAYS} days.`,
    ignore: "If you didn't create a Fitwise account, ignore this email and nothing more will be sent.",
    footer: "You got this email because someone signed up for Fitwise with this address.",
  },
  sv: {
    subject: "Bekräfta din e-post för Fitwise",
    pre: "Ett klick så kan dina veckovisa jobbmatchningar nå dig.",
    hi: (n: string | null) => (n ? `Hej ${n},` : "Hej,"),
    body: "Bekräfta att det här är din e-postadress så skickar vi de bästa nya jobben för dig en gång i veckan. Du kan stänga av det när du vill.",
    button: "Bekräfta min e-post",
    expiry: `Länken fungerar i ${VERIFY_DAYS} dagar.`,
    ignore: "Har du inte skapat ett Fitwise-konto kan du strunta i mejlet, så skickas inget mer.",
    footer: "Du får det här mejlet för att någon registrerat sig på Fitwise med den här adressen.",
  },
};

export function verifyEmail({ name, link, locale }: { name: string | null; link: string; locale: Locale }) {
  const c = COPY[locale];
  const first = name?.trim().split(/\s+/)[0] ?? null;
  const html = emailLayout({
    preheader: c.pre,
    body: `<p style="margin:0 0 14px">${esc(c.hi(first))}</p>
<p style="margin:0 0 22px">${esc(c.body)}</p>
<p style="margin:0 0 22px">${emailButton(link, c.button)}</p>
<p style="margin:0 0 8px;font-size:13px;color:#5c6068">${esc(c.expiry)}</p>
<p style="margin:0;font-size:13px;color:#5c6068">${esc(c.ignore)}</p>`,
    footer: esc(c.footer),
  });
  return { subject: c.subject, html, text: [c.hi(first), "", c.body, link, "", c.expiry, c.ignore].join("\n") };
}

/** Sends a confirmation link. Returns false when this account already got three in the last hour. */
export async function sendVerification(user: { id: string; name: string | null; email: string }, base: string, locale: Locale): Promise<boolean> {
  const token = await createEmailToken(user.id, "verify", VERIFY_DAYS * 1440, 3);
  if (!token) return false;
  await sendEmail({ to: user.email, ...verifyEmail({ name: user.name, link: `${base}/verify-email?token=${token}`, locale }) });
  return true;
}

/** Uses the link. Returns true when the address is now confirmed. */
export async function confirmEmail(token: string): Promise<boolean> {
  const userId = await spendToken(token, "verify");
  if (!userId) return false;
  await sql("UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1", [userId]);
  return true;
}
