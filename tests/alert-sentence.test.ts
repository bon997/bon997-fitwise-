import { describe, expect, it } from "vitest";
import { parseAlertSentence, describeUnderstood } from "@/lib/alert-sentence";

describe("plain-language alerts", () => {
  it("reads the brief's examples", () => {
    expect(parseAlertSentence("Send me 5 logistics jobs in Gothenburg every day").settings)
      .toEqual({ frequency: "daily", count: 5, categories: ["logistics"], city: "gothenburg", radius_km: 25 });
    expect(parseAlertSentence("Send procurement jobs weekly").settings).toEqual({ frequency: "weekly", categories: ["procurement"] });
    expect(parseAlertSentence("Send supply chain manager jobs monthly").settings).toEqual({ frequency: "monthly", categories: ["supply_chain"] });
  });

  it("reads Swedish, number words, nearby towns, radius and match", () => {
    const r = parseAlertSentence("Tio inköpsjobb i Mölndal varje månad, minst 80 % matchning");
    expect(r.settings).toEqual({ frequency: "monthly", count: 10, categories: ["procurement", "purchasing"], city: "gothenburg", radius_km: 25, min_match: 80 });
    expect(describeUnderstood(r, "sv")).toBe("Varje månad · 10 jobb · Upphandling, Inköp · Göteborg (25 km) · minst 80 %");
    expect(parseAlertSentence("warehouse jobs within 100 km of Borås").settings).toMatchObject({ city: "boras", radius_km: 100, categories: ["warehouse"] });
    expect(parseAlertSentence("3 jobs per week in Kungsbacka").settings).toMatchObject({ count: 3, city: "gothenburg", radius_km: 50 });
  });

  it("falls back to all of Sweden for far-away towns and 'anywhere'", () => {
    const far = parseAlertSentence("logistics jobs in Umeå daily");
    expect(far.settings.city).toBe("sweden");
    expect(far.farTown).toBe("umeå");
    expect(parseAlertSentence("20 transport jobs anywhere").settings).toMatchObject({ count: 20, city: "sweden", categories: ["transport"] });
  });

  it("snaps numbers to the choices the form has and ignores what it doesn't know", () => {
    expect(parseAlertSentence("send me 7 jobs").settings).toEqual({ count: 5 });
    expect(parseAlertSentence("hello there").understood).toEqual([]);
  });
});
