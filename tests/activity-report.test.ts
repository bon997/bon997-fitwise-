import { describe, expect, it } from "vitest";
import { defaultReportMonth, monthKey, monthName, parseMonth, reportCsv, reportText, shiftMonth, type ReportRow } from "@/lib/activity-report";

const row = (over: Partial<ReportRow> = {}): ReportRow => ({
  applied_on: "2026-10-03",
  title: "Lagerarbetare",
  company: "Åhléns",
  location: "Malmö",
  status: "applied",
  source: "jobtech",
  ad_id: "29384756",
  apply_url: "https://example.com/apply",
  ...over,
});

describe("activity report months", () => {
  it("parses and rejects month strings", () => {
    expect(parseMonth("2026-10")).toEqual({ year: 2026, month: 10 });
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("2026-1")).toBeNull();
    expect(parseMonth(undefined)).toBeNull();
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(monthKey({ year: 2027, month: 3 })).toBe("2027-03");
  });

  it("defaults to last month during the reporting window (1st–14th)", () => {
    expect(defaultReportMonth(new Date("2026-11-05T10:00:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(defaultReportMonth(new Date("2026-01-14T10:00:00Z"))).toEqual({ year: 2025, month: 12 });
    expect(defaultReportMonth(new Date("2026-11-20T10:00:00Z"))).toEqual({ year: 2026, month: 11 });
  });

  it("uses Swedish time at midnight", () => {
    // 23:30 UTC on 14 Nov is already 15 Nov in Stockholm.
    expect(defaultReportMonth(new Date("2026-11-14T23:30:00Z"))).toEqual({ year: 2026, month: 11 });
  });

  it("names months in both languages", () => {
    expect(monthName({ year: 2026, month: 10 }, "sv")).toBe("Oktober 2026");
    expect(monthName({ year: 2026, month: 10 }, "en")).toBe("October 2026");
  });
});

describe("activity report export", () => {
  it("writes an Excel-friendly CSV with Swedish headers", () => {
    const csv = reportCsv([row()], "sv", (s) => (s === "applied" ? "Ansökt" : s));
    expect(csv.startsWith("﻿")).toBe(true);
    const [head, line] = csv.slice(1).trim().split("\r\n");
    expect(head).toBe('"Datum";"Tjänst";"Arbetsgivare";"Ort";"Annons-ID";"Var annonsen fanns";"Länk";"Status"');
    expect(line).toBe('"2026-10-03";"Lagerarbetare";"Åhléns";"Malmö";"29384756";"Platsbanken";"https://example.com/apply";"Ansökt"');
  });

  it("escapes quotes and neutralises formulas", () => {
    const csv = reportCsv([row({ title: 'Säljare "B2B"', company: "=HYPERLINK(1)", ad_id: null, source: "serpapi" })], "en", (s) => s);
    expect(csv).toContain('"Säljare ""B2B"""');
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain('"";"Fitwise"');
  });

  it("makes a pasteable text list", () => {
    expect(reportText([row(), row({ ad_id: null, location: null, title: "Truckförare" })])).toBe(
      "2026-10-03 · Lagerarbetare · Åhléns · Malmö · Platsbanken 29384756\n2026-10-03 · Truckförare · Åhléns",
    );
  });
});
