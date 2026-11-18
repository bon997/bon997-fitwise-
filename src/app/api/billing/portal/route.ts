import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/google-oauth";
import { billingConfigured, portalUrl } from "@/lib/billing";

/** POST /api/billing/portal → { url } of Stripe's Customer Portal (change plan, card, receipts, cancel). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  if (!billingConfigured()) throw new HttpError(503, "Payments aren't switched on yet");
  if (!user.stripe_customer_id) throw new HttpError(409, "No subscription to manage yet");
  return ok({ url: await portalUrl(user, appUrl(req)) });
});
