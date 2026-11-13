import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  plan: z.enum(["basic", "pro", "premium"]),
});

/**
 * PATCH /api/admin/plan { email, plan }: give someone a plan by hand (testers,
 * partners, refunds) without Stripe. Marked "manual" so a Stripe webhook for
 * a real subscription later simply takes over.
 */
export const PATCH = route(async (req: Request) => {
  await requireAdmin(req);
  const { email, plan } = Body.parse(await readJson(req));
  const row = await one<{ email: string; plan: string }>(
    `UPDATE users SET plan = $2, plan_status = CASE WHEN $2 = 'basic' THEN NULL ELSE 'manual' END
     WHERE lower(email) = $1 RETURNING email, plan`,
    [email, plan],
  );
  if (!row) throw new HttpError(404, "No account with that email");
  return ok(row);
});
