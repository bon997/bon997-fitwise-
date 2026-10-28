import { z } from "zod";
import { route, readJson } from "@/lib/http";
import { assertSameOrigin, startSession } from "@/lib/auth-forms";
import { resetPassword } from "@/lib/password-reset";
import { localeFromRequest } from "@/i18n/server";

const Body = z.object({ token: z.string().max(100), password: z.string().max(200) });

/** POST /api/auth/reset { token, password } sets the new password, signs out every other device and signs in here. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const { token, password } = Body.parse(await readJson(req));
  const userId = await resetPassword(token, password, localeFromRequest(req));
  return startSession(req, userId, "/dashboard");
});
