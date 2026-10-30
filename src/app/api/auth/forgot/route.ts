import { after } from "next/server";
import { z } from "zod";
import { route, readJson, ok, HttpError } from "@/lib/http";
import { one } from "@/lib/db";
import { appUrl } from "@/lib/google-oauth";
import { assertSameOrigin } from "@/lib/auth-forms";
import { clientIp, isLockedOut, recordIpAttempt } from "@/lib/rate-limit";
import { emailConfigured, sendEmail } from "@/lib/email";
import { createResetToken, resetEmail } from "@/lib/password-reset";
import { localeFromRequest, say } from "@/i18n/server";

const Body = z.object({ email: z.string().trim().toLowerCase().max(254) });

/**
 * POST /api/auth/forgot { email }
 * Always answers the same way, and sends the email after the response, so the
 * form can't be used to find out which addresses have accounts.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  if (!emailConfigured()) {
    throw new HttpError(503, say(req, "Password reset by email isn't switched on yet. If you use Gmail, sign in with “Continue with Google”.", "Återställning via e-post är inte påslagen än. Använder du Gmail kan du logga in med ”Fortsätt med Google”."));
  }
  const { email } = Body.parse(await readJson(req));
  const ip = clientIp(req);
  if (await isLockedOut(email, ip)) throw new HttpError(429, say(req, "Too many attempts. Please wait 15 minutes and try again.", "För många försök. Vänta 15 minuter och försök igen."));
  await recordIpAttempt(ip);

  const locale = localeFromRequest(req);
  const base = appUrl(req);
  after(async () => {
    try {
      const user = await one<{ id: string; name: string | null }>("SELECT id, name FROM users WHERE email = $1", [email]);
      if (!user) return;
      const token = await createResetToken(user.id);
      if (!token) return;
      await sendEmail({ to: email, ...resetEmail({ name: user.name, link: `${base}/reset-password?token=${token}`, locale }) });
    } catch (e) {
      console.error("password reset email failed", e);
    }
  });
  return ok({ ok: true });
});
