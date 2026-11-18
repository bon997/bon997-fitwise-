import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

// Fake database: records the user update and the processed event ids.
const db = vi.hoisted(() => ({ events: new Set<string>(), updates: [] as unknown[][], fail: false }));
vi.mock("@/lib/db", () => ({
  sql: vi.fn(async (q: string, p: unknown[]) => { if (q.startsWith("DELETE FROM stripe_events")) db.events.delete(p[0] as string); return []; }),
  one: vi.fn(async (q: string, p: unknown[]) => {
    if (q.startsWith("INSERT INTO stripe_events")) {
      if (db.events.has(p[0] as string)) return null;
      db.events.add(p[0] as string);
      return { id: p[0] };
    }
    if (q.startsWith("UPDATE users")) {
      if (db.fail) throw new Error("db down");
      db.updates.push(p);
      return { id: "user-1" };
    }
    return null;
  }),
}));

import { handleStripeEvent, verifyWebhook } from "@/lib/billing";

const secret = "whsec_test_secret";
beforeEach(() => {
  db.events.clear(); db.updates = []; db.fail = false;
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
  vi.stubEnv("STRIPE_PRICE_PRO", "price_pro");
  vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_premium");
});
afterEach(() => vi.unstubAllEnvs());

const subEvent = (id: string, status: string, price = "price_pro") => ({
  id, type: "customer.subscription.updated", object: "event",
  data: { object: {
    id: "sub_1", object: "subscription", customer: "cus_1", status, metadata: { user_id: "user-1" },
    items: { data: [{ price: { id: price }, current_period_end: 1_795_000_000 }] },
  } },
}) as unknown as Stripe.Event;

describe("Stripe webhook", () => {
  it("accepts a correctly signed payload and rejects a tampered one", () => {
    const payload = JSON.stringify(subEvent("evt_1", "active"));
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(verifyWebhook(payload, header).id).toBe("evt_1");
    expect(() => verifyWebhook(payload.replace("active", "canceled"), header)).toThrow();
    expect(() => verifyWebhook(payload, null)).toThrow(/Missing/);
  });

  it("writes plan, status and paid-until onto the user", async () => {
    expect(await handleStripeEvent(subEvent("evt_2", "active", "price_premium"))).toBe("synced user-1");
    const [userId, customer, plan, status, end, subId] = db.updates[0];
    expect({ userId, customer, plan, status, subId }).toEqual({ userId: "user-1", customer: "cus_1", plan: "premium", status: "active", subId: "sub_1" });
    expect((end as Date).toISOString()).toBe(new Date(1_795_000_000 * 1000).toISOString());
  });

  it("applies each event once, even when Stripe sends it twice", async () => {
    await handleStripeEvent(subEvent("evt_3", "active"));
    expect(await handleStripeEvent(subEvent("evt_3", "active"))).toBe("duplicate");
    expect(db.updates).toHaveLength(1);
  });

  it("a failed event is forgotten so Stripe's retry is applied", async () => {
    db.fail = true;
    await expect(handleStripeEvent(subEvent("evt_4", "active"))).rejects.toThrow("db down");
    db.fail = false;
    expect(await handleStripeEvent(subEvent("evt_4", "active"))).toBe("synced user-1");
  });

  it("ignores events it doesn't need", async () => {
    expect(await handleStripeEvent({ id: "evt_5", type: "invoice.paid", data: { object: {} } } as unknown as Stripe.Event)).toBe("ignored");
  });
});
