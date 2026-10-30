/**
 * Password reset by email. The link carries a random 256-bit token that works
 * once, for one hour; the database stores only its SHA-256 hash.
 *
 * Using the link proves the person controls the inbox, so it also marks the
 * email as verified (the same proof Google sign-in gives). That ends the
 * takeover window described in the README: a password set this way is the
 * inbox owner's, and every older session is signed out.
 */
import { sql } from "./db";
import { HttpError } from "./http";
import { hashPassword, passwordProblem } from "./password";
import { clearFailures } from "./rate-limit";
import { emailButton, emailLayout, esc } from "./email";
import { createEmailToken, dropUnusedTokens, spendToken, tokenUser } from "./email-tokens";
import type { Locale } from "@/i18n/config";

export const RESET_MINUTES = 60;
/** At most this many reset emails per account per hour, so nobody can flood an inbox. */
export const RESETS_PER_HOUR = 3;

export const createResetToken = (userId: string) => createEmailToken(userId, "reset", RESET_MINUTES, RESETS_PER_HOUR);

/** Is this link still usable? Lets the page say "expired" before the user types a new password. */
export const resetTokenValid = async (token: string) => Boolean(await tokenUser(token, "reset"));

const EXPIRED = {
  en: "This reset link has expired or was already used. Ask for a new one.",
  sv: "Länken har gått ut eller redan använts. Be om en ny.",
};

/** Sets the new password and returns the user's id. Throws a 400 with a readable message on any problem. */
export async function resetPassword(token: string, password: string, locale: Locale): Promise<string> {
  const user = await tokenUser(token, "reset");
  if (!user) throw new HttpError(400, EXPIRED[locale]);

  // Check the password before spending the link, so a weak choice can be corrected.
  const weak = passwordProblem(password, user.email, locale);
  if (weak) throw new HttpError(400, weak);
  if ((await spendToken(token, "reset")) !== user.id) throw new HttpError(400, EXPIRED[locale]);

  await sql("UPDATE users SET password_hash = $2, email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1", [user.id, await hashPassword(password)]);
  await dropUnusedTokens(user.id, "reset");
  await sql("DELETE FROM sessions WHERE user_id = $1", [user.id]);
  await clearFailures(user.email);
  return user.id;
}

const COPY = {
  en: {
    subject: "Reset your Fitwise password",
    pre: "Choose a new password. The link works for one hour.",
    hi: (n: string | null) => (n ? `Hi ${n},` : "Hi,"),
    body: "Someone (hopefully you) asked to reset the password for your Fitwise account. Choose a new one here:",
    button: "Choose a new password",
    expiry: `The link works once, for ${RESET_MINUTES} minutes.`,
    ignore: "If you didn't ask for this, ignore this email. Your password stays the same.",
    footer: "You got this email because a password reset was requested for this address on Fitwise.",
  },
  sv: {
    subject: "Återställ ditt lösenord på Fitwise",
    pre: "Välj ett nytt lösenord. Länken fungerar i en timme.",
    hi: (n: string | null) => (n ? `Hej ${n},` : "Hej,"),
    body: "Någon (förhoppningsvis du) har bett om att återställa lösenordet till ditt Fitwise-konto. Välj ett nytt här:",
    button: "Välj ett nytt lösenord",
    expiry: `Länken fungerar en gång, i ${RESET_MINUTES} minuter.`,
    ignore: "Har du inte bett om detta kan du strunta i mejlet. Ditt lösenord förblir detsamma.",
    footer: "Du får det här mejlet för att någon begärt en lösenordsåterställning för den här adressen på Fitwise.",
  },
};

export function resetEmail({ name, link, locale }: { name: string | null; link: string; locale: Locale }) {
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
  const text = [c.hi(first), "", c.body, link, "", c.expiry, c.ignore].join("\n");
  return { subject: c.subject, html, text };
}
