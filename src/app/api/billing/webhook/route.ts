import { handleStripeEvent, verifyWebhook } from "@/lib/billing";

/**
 * POST /api/billing/webhook: Stripe's events (subscription created / updated /
 * cancelled). The signature is checked against STRIPE_WEBHOOK_SECRET over the raw
 * body, so this route reads text, not JSON. Each event is applied once.
 */
export async function POST(req: Request) {
  let event;
  try {
    event = verifyWebhook(await req.text(), req.headers.get("stripe-signature"));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad signature" }, { status: 400 });
  }
  try {
    return Response.json({ received: true, result: await handleStripeEvent(event) });
  } catch (e) {
    console.error("stripe webhook failed", event.type, e);
    return Response.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
}
