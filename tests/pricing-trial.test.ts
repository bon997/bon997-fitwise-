import { afterEach, describe, expect, it, vi } from "vitest";
import { currentPlan, trialDaysLeft, trialJustEnded, periodDeal, offeredPeriods, planForPrice, stripePriceId, can } from "@/lib/plans";

const now = new Date("2026-11-20T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 864e5);

afterEach(() => vi.unstubAllEnvs());

describe("free Pro trial", () => {
  it("lifts Basic to Pro while it runs, and only while the paywall is on", () => {
    vi.stubEnv("PAYWALL_ENABLED", "true");
    const u = { plan: "basic", trial_ends_at: days(3) };
    expect(currentPlan(u, now)).toBe("pro");
    expect(can(u, "job_alerts", now)).toBe(true);
    expect(can(u, "cover_letters", now)).toBe(false); // Premium stays Premium
    expect(trialDaysLeft(u, now)).toBe(3);
    expect(currentPlan({ plan: "basic", trial_ends_at: days(-1) }, now)).toBe("basic");
    expect(trialJustEnded({ plan: "basic", trial_ends_at: days(-1) }, now)).toBe(true);
    expect(trialJustEnded({ plan: "basic", trial_ends_at: days(-30) }, now)).toBe(false);
  });

  it("never lowers a paid plan and shows no countdown for payers", () => {
    vi.stubEnv("PAYWALL_ENABLED", "true");
    const u = { plan: "premium", plan_status: "active", trial_ends_at: days(3) };
    expect(currentPlan(u, now)).toBe("premium");
    expect(trialDaysLeft(u, now)).toBeNull();
  });
});

describe("billing periods", () => {
  it("works out per-month price and saving", () => {
    expect(periodDeal("pro", "quarter")).toEqual({ total: 199, perMonth: 66, save: 16, months: 3 });
    expect(periodDeal("pro", "year")).toEqual({ total: 590, perMonth: 49, save: 38, months: 12 });
    expect(periodDeal("premium", "year").save).toBe(33);
  });

  it("offers 3 and 12 months only once their Stripe prices exist", () => {
    expect(offeredPeriods()).toEqual(["month", "quarter", "year"]); // no Stripe yet: show them all
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    expect(offeredPeriods()).toEqual(["month"]);
    vi.stubEnv("STRIPE_PRICE_PRO_YEAR", "price_py");
    vi.stubEnv("STRIPE_PRICE_PREMIUM_YEAR", "price_mpy");
    expect(offeredPeriods()).toEqual(["month", "year"]);
  });

  it("maps every period's Stripe price back to its plan", () => {
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pm");
    vi.stubEnv("STRIPE_PRICE_PREMIUM_QUARTER", "price_mq");
    expect(planForPrice("price_pm")).toBe("pro");
    expect(planForPrice("price_mq")).toBe("premium");
    expect(planForPrice("price_other")).toBeNull();
    expect(stripePriceId("premium", "quarter")).toBe("price_mq");
  });
});
