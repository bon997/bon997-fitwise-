/**
 * Stripe billing: Checkout for new subscriptions, the Customer Portal for
 * changes and cancelling, and webhooks that keep users.plan in step.
 *
 * Environment (Vercel):
 *   STRIPE_SECRET_KEY        sk_live_… / sk_test_…
 *   STRIPE_WEBHOOK_SECRET    whsec_… (from the webhook endpoint in Stripe)
 *   STRIPE_PRICE_PRO         price_… (monthly, SEK, VAT included)
 *   STRIPE_PRICE_PREMIUM     price_…
 *   STRIPE_AUTOMATIC_TAX     "true" once Stripe Tax is set up (optional)
 *   PAYWALL_ENABLED          "true" to start enforcing plans (see plans.ts)
 */
import Stripe from "stripe";
import { sql, one } from "./db";
import { planForPrice, stripePriceId, type Plan } from "./plans";
import type { UserRow } from "./data";

let client: Stripe | null = null;
export const billingConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY?.trim());
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

/** The person's Stripe customer, created on first use and remembered on the user row. */
async function customerFor(user: UserRow): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const c = await stripe().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    preferred_locales: [user.locale === "sv" ? "sv" : "en"],
    metadata: { user_id: user.id },
  });
  await sql("UPDATE users SET stripe_customer_id = $2 WHERE id = $1", [user.id, c.id]);
  return c.id;
}

const hasLiveSubscription = (u: UserRow) =>
  Boolean(u.stripe_subscription_id) && ["active", "trialing", "past_due"].includes(u.plan_status ?? "");

/**
 * Where to send someone who picked a paid plan. New subscribers go to Checkout;
 * people who already pay go to the Portal to switch plans, so nobody ends up
 * with two subscriptions.
 */
export async function checkoutUrl(user: UserRow, plan: Exclude<Plan, "basic">, base: string): Promise<string> {
  const price = stripePriceId(plan);
  if (!price) throw new Error(`STRIPE_PRICE_${plan.toUpperCase()} is not set`);
  if (hasLiveSubscription(user)) return portalUrl(user, base);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(user),
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id, plan } },
    allow_promotion_codes: true,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX?.trim() === "true" },
    ...(process.env.STRIPE_AUTOMATIC_TAX?.trim() === "true" ? { customer_update: { address: "auto" as const } } : {}),
    locale: user.locale === "sv" ? "sv" : "auto",
    success_url: `${base}/account?checkout=success`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}

/** Stripe's hosted page for changing plan, payment method, receipts and cancelling. */
export async function portalUrl(user: UserRow, base: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({ customer: await customerFor(user), return_url: `${base}/account` });
  return session.url;
}

/** Verify a webhook's signature and parse it. Throws on a bad signature. */
export function verifyWebhook(rawBody: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  if (!signature) throw new Error("Missing Stripe-Signature header");
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/** Stripe moved the period end from the subscription to its items; read whichever is there. */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const legacy = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const ts = item?.current_period_end ?? legacy ?? sub.ended_at ?? null;
  return ts ? new Date(ts * 1000) : null;
}

/** Write a subscription's plan, status and period onto its user. Returns the user id, or null if unknown. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const plan = planForPrice(sub.items?.data?.[0]?.price?.id) ?? (sub.metadata?.plan as Plan | undefined) ?? null;
  const row = await one<{ id: string }>(
    `UPDATE users SET
       plan = coalesce($3, plan), plan_status = $4, plan_period_end = $5,
       stripe_subscription_id = $6, stripe_customer_id = $2
     WHERE stripe_customer_id = $2 OR id::text = $1
     RETURNING id`,
    [sub.metadata?.user_id ?? "", customer, plan, sub.status, periodEnd(sub), sub.id],
  );
  return row?.id ?? null;
}

/** Handle one webhook event exactly once. Returns what happened, for the response and logs. */
export async function handleStripeEvent(event: Stripe.Event): Promise<string> {
  const fresh = await one("INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id", [event.id, event.type]);
  if (!fresh) return "duplicate";
  try {
    return await applyEvent(event);
  } catch (e) {
    // Forget it, so Stripe's retry is applied instead of skipped as a duplicate.
    await sql("DELETE FROM stripe_events WHERE id = $1", [event.id]);
    throw e;
  }
}

async function applyEvent(event: Stripe.Event): Promise<string> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      const id = await syncSubscription(event.data.object as Stripe.Subscription);
      return id ? `synced ${id}` : "no matching user";
    }
    default:
      return "ignored";
  }
}
