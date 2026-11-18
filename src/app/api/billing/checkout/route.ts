import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/google-oauth";
import { billingConfigured, checkoutUrl } from "@/lib/billing";
import { PERIODS } from "@/lib/plans";

const Body = z.object({ plan: z.enum(["pro", "premium"]), period: z.enum(PERIODS).default("month") });

/** POST /api/billing/checkout { plan, period? (month|quarter|year) } → { url } of Stripe Checkout (or the Portal for current subscribers). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  if (!billingConfigured()) throw new HttpError(503, "Payments aren't switched on yet");
  const { plan, period } = Body.parse(await readJson(req));
  return ok({ url: await checkoutUrl(user, plan, appUrl(req), period) });
});
