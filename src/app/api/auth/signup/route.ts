import { after } from "next/server";
import { z } from "zod";
import { route, readJson, HttpError } from "@/lib/http";
import { one } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";
import { appUrl, safeReturnTo } from "@/lib/google-oauth";
import { assertSameOrigin, startSession } from "@/lib/auth-forms";
import { clientIp, isLockedOut, recordFailure } from "@/lib/rate-limit";
import { say, localeFromRequest } from "@/i18n/server";
import { emailConfigured } from "@/lib/email";
import { sendVerification } from "@/lib/email-verify";

const Body = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.email("Enter a valid email address").max(254).transform((e) => e.toLowerCase().trim()),
  password: z.string().max(200),
  returnTo: z.string().optional(),
});

/**
 * POST /api/auth/signup { name, email, password, returnTo? }
 * Creates an email + password account and signs it in.
 * Never grants admin: admin comes only from a Google-verified ADMIN_EMAILS address.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const body = Body.parse(await readJson(req));
  const ip = clientIp(req);
  if (await isLockedOut(body.email, ip)) throw new HttpError(429, say(req, "Too many attempts. Please wait 15 minutes and try again.", "För många försök. Vänta 15 minuter och försök igen."));

  const weak = passwordProblem(body.password, body.email, localeFromRequest(req));
  if (weak) throw new HttpError(400, weak);

  const existing = await one<{ password_hash: string | null; google_id: string | null }>(
    "SELECT password_hash, google_id FROM users WHERE email = $1",
    [body.email],
  );
  if (existing) {
    // Counts toward the limit so this can't be used to cheaply test which emails have accounts.
    await recordFailure(body.email, ip);
    throw new HttpError(
      409,
      existing.google_id && !existing.password_hash
        ? say(req, "This email already has an account. Use “Continue with Google”.", "Den här e-postadressen har redan ett konto. Använd ”Fortsätt med Google”.")
        : say(req, "This email already has an account. Sign in instead.", "Den här e-postadressen har redan ett konto. Logga in i stället."),
    );
  }

  const user = await one<{ id: string }>(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
    [body.name, body.email, await hashPassword(body.password)],
  );
  if (!user) throw new HttpError(409, say(req, "This email already has an account. Sign in instead.", "Den här e-postadressen har redan ett konto. Logga in i stället."));

  // Ask the new user to confirm their address; job alerts only go to confirmed ones.
  if (emailConfigured()) {
    const [base, locale] = [appUrl(req), localeFromRequest(req)];
    after(() => sendVerification({ id: user.id, name: body.name, email: body.email }, base, locale).catch((e) => console.error("verification email failed", e)));
  }

  // New accounts start with the short onboarding questions.
  const dest = safeReturnTo(body.returnTo);
  return startSession(req, user.id, dest === "/dashboard" ? "/onboarding" : dest);
});
