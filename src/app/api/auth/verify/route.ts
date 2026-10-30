import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/google-oauth";
import { assertSameOrigin } from "@/lib/auth-forms";
import { emailConfigured } from "@/lib/email";
import { sendVerification } from "@/lib/email-verify";
import { localeFromRequest, say } from "@/i18n/server";

/** POST /api/auth/verify sends the signed-in user a link to confirm their email address. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser(req);
  if (user.email_verified_at) return ok({ ok: true, already: true });
  if (!emailConfigured()) throw new HttpError(503, say(req, "Email isn't switched on yet.", "E-post är inte påslagen än."));
  const sent = await sendVerification(user, appUrl(req), localeFromRequest(req));
  if (!sent) throw new HttpError(429, say(req, "We've sent a few links already. Check your inbox and spam folder, or try again in an hour.", "Vi har redan skickat några länkar. Titta i inkorgen och skräpposten, eller försök igen om en timme."));
  return ok({ ok: true });
});
