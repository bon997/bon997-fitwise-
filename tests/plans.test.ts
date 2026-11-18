import { afterEach, describe, expect, it, vi } from "vitest";
import { can, currentPlan, planFor, planForPrice } from "@/lib/plans";

afterEach(() => vi.unstubAllEnvs());
const now = new Date("2026-11-08T12:00:00Z");

describe("plans", () => {
  it("while the paywall is off (beta), everyone has Premium", () => {
    vi.stubEnv("PAYWALL_ENABLED", "");
    expect(currentPlan({ plan: "basic" }, now)).toBe("premium");
    expect(can({ plan: "basic" }, "cover_letters", now)).toBe(true);
  });

  it("with the paywall on, Basic gets the basics only", () => {
    vi.stubEnv("PAYWALL_ENABLED", "true");
    const basic = { plan: "basic" };
    expect(currentPlan(basic, now)).toBe("basic");
    expect(can(basic, "job_alerts", now)).toBe(false);
    expect(can(basic, "match_breakdown", now)).toBe(false);
    expect(can(basic, "cover_letters", now)).toBe(false);
    expect(currentPlan(null, now)).toBe("basic");
  });

  it("Pro unlocks alerts and analysis, Premium also cover letters", () => {
    vi.stubEnv("PAYWALL_ENABLED", "true");
    const pro = { plan: "pro", plan_status: "active" };
    expect(can(pro, "job_alerts", now)).toBe(true);
    expect(can(pro, "skill_gaps", now)).toBe(true);
    expect(can(pro, "cover_letters", now)).toBe(false);
    expect(can({ plan: "premium", plan_status: "active" }, "cover_letters", now)).toBe(true);
    expect(planFor("cover_letters")).toBe("premium");
    expect(planFor("job_alerts")).toBe("pro");
  });

  it("a cancelled plan lasts until the paid period ends; admins and manual grants always count", () => {
    vi.stubEnv("PAYWALL_ENABLED", "true");
    expect(currentPlan({ plan: "pro", plan_status: "canceled", plan_period_end: "2026-11-20T00:00:00Z" }, now)).toBe("pro");
    expect(currentPlan({ plan: "pro", plan_status: "canceled", plan_period_end: "2026-11-01T00:00:00Z" }, now)).toBe("basic");
    expect(currentPlan({ plan: "pro", plan_status: "unpaid" }, now)).toBe("basic");
    expect(currentPlan({ plan: "premium", plan_status: "manual" }, now)).toBe("premium");
    expect(currentPlan({ plan: "basic", role: "admin" }, now)).toBe("premium");
  });

  it("maps Stripe prices back to plans", () => {
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro");
    vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_prem");
    expect(planForPrice("price_pro")).toBe("pro");
    expect(planForPrice("price_prem")).toBe("premium");
    expect(planForPrice("price_other")).toBeNull();
  });
});
