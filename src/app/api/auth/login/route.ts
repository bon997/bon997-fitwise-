import { z } from "zod";
import { route, readJson, HttpError } from "@/lib/http";
import { one } from "@/lib/db";
import { burnPasswordCheck, verifyPassword } from "@/lib/password";
import { safeReturnTo } from "@/lib/google-oauth";
import { assertSameOrigin, startSession } from "@/lib/auth-forms";
import { clearFailures, clientIp, isLockedOut, recordFailure } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().max(200),
  returnTo: z.string().optional(),
});

const WRONG = "Email or password is incorrect.";

/**
 * POST /api/auth/login { email, password, returnTo? }
 * The same error is returned whether the email or the password is wrong, and
 * the timing is the same, so the form can't be used to discover accounts.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const body = Body.parse(await readJson(req));
  const ip = clientIp(req);
  if (await isLockedOut(body.email, ip)) throw new HttpError(429, "Too many attempts. Please wait 15 minutes and try again.");

  const user = await one<{ id: string; password_hash: string | null }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [body.email],
  );
  const ok = user?.password_hash ? await verifyPassword(body.password, user.password_hash) : (await burnPasswordCheck(body.password), false);

  if (!user || !ok) {
    await recordFailure(body.email, ip);
    throw new HttpError(401, WRONG);
  }
  await clearFailures(body.email);
  return startSession(req, user.id, safeReturnTo(body.returnTo));
});
