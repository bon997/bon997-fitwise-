import { describe, it, expect } from "vitest";
import { DEFAULT_ALERTS, alertSettingsFor, alertSubject, alertSummary, distanceKm, inArea, inCategories, isDue, stockholmDay, townOf, AlertSettingsSchema } from "@/lib/alert-settings";

const example = { frequency: "daily", count: 3, categories: ["logistics"], city: "gothenburg", radius_km: 100, min_match: 80 } as const;

describe("alert settings", () => {
  it("the brief's example reads back as promised", () => {
    expect(AlertSettingsSchema.parse(example)).toEqual(example);
    expect(alertSummary({ ...example, categories: [...example.categories] }, "en"))
      .toBe("Every day you get the 3 best Logistics jobs within 100 km of Gothenburg that match at least 80% of your profile.");
    expect(alertSubject({ frequency: "daily", categories: ["logistics"] }, 3, "en")).toBe("Today's Top 3 Logistics Jobs Matching Your Profile");
    expect(alertSubject({ frequency: "weekly", categories: [] }, 1, "en")).toBe("This Week's Top Job Matching Your Profile");
    expect(alertSubject({ frequency: "daily", categories: ["logistics"] }, 3, "sv")).toBe("Dagens topp 3: jobb inom logistik som matchar din profil");
  });

  it("rejects values outside the offered choices and falls back to defaults", () => {
    expect(AlertSettingsSchema.safeParse({ ...example, count: 4 }).success).toBe(false);
    expect(AlertSettingsSchema.safeParse({ ...example, radius_km: 75 }).success).toBe(false);
    expect(alertSettingsFor({})).toEqual(DEFAULT_ALERTS);
    expect(alertSettingsFor({ alerts: { count: 999 } })).toEqual(DEFAULT_ALERTS);
    expect(alertSettingsFor({ alerts: { frequency: "daily" } }).frequency).toBe("daily");
  });

  it("puts jobs in categories by title and skills, Swedish or English", () => {
    expect(inCategories({ title: "Logistiksamordnare" }, ["logistics"])).toBe(true);
    expect(inCategories({ title: "Lagerarbetare till Postnord" }, ["warehouse"])).toBe(true);
    expect(inCategories({ title: "Assistent", skills: [{ name: "procurement" }] }, ["procurement"])).toBe(true);
    expect(inCategories({ title: "Frontend Developer" }, ["logistics", "warehouse"])).toBe(false);
    expect(inCategories({ title: "Anything" }, [])).toBe(true);
  });

  it("places towns and measures distance from the chosen city", () => {
    expect(townOf("Borås, Västra Götalands län")).not.toBeNull();
    expect(townOf("Gothenburg, Sweden")).toEqual(townOf("Göteborg"));
    expect(townOf("Somewhere unknown")).toBeNull();
    const gbgBoras = distanceKm(townOf("Göteborg")!, townOf("Borås")!);
    expect(gbgBoras).toBeGreaterThan(50);
    expect(gbgBoras).toBeLessThan(65); // ~57 km in a straight line
    expect(inArea({ location: "Borås", remote: false }, { city: "gothenburg", radius_km: 100 }).ok).toBe(true);
    expect(inArea({ location: "Borås", remote: false }, { city: "gothenburg", radius_km: 25 }).ok).toBe(false);
    expect(inArea({ location: "Stockholm", remote: false }, { city: "gothenburg", radius_km: 200 }).ok).toBe(false);
    expect(inArea({ location: "Kiruna", remote: true }, { city: "gothenburg", radius_km: 25 }).ok).toBe(true);
    expect(inArea({ location: "Nowhere", remote: false }, { city: "gothenburg", radius_km: 200 }).ok).toBe(false);
    expect(inArea({ location: null, remote: false }, { city: "sweden", radius_km: 25 }).ok).toBe(true);
  });

  it("schedule: daily every day once, weekly on Mondays, monthly on the 1st (Stockholm time)", () => {
    const mon = new Date("2026-11-09T07:05:00Z"); // Monday 08:05 in Stockholm
    const tue = new Date("2026-11-10T07:05:00Z");
    const first = new Date("2026-12-01T07:05:00Z");
    expect(stockholmDay(mon)).toMatchObject({ date: "2026-11-09", weekday: 1, dom: 9 });
    expect(isDue("daily", new Date("2026-11-08T07:00:00Z"), mon)).toBe(true);
    expect(isDue("daily", new Date("2026-11-09T07:00:00Z"), mon)).toBe(false); // already sent today
    expect(isDue("weekly", null, mon)).toBe(true);
    expect(isDue("weekly", null, tue)).toBe(false);
    expect(isDue("weekly", new Date("2026-11-01T07:00:00Z"), tue)).toBe(true); // missed Monday: catch up after 8 days
    expect(isDue("monthly", null, first)).toBe(true);
    expect(isDue("monthly", new Date("2026-11-20T07:00:00Z"), tue)).toBe(false);
  });
});
