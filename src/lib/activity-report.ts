/**
 * Arbetsförmedlingen's monthly activity report (aktivitetsrapport): registered
 * job seekers list the jobs they applied for each month and send the list
 * between the 1st and the 14th of the following month. This turns the
 * application tracker into that list.
 */
import { sql } from "./db";
import type { Locale } from "@/i18n/config";

export type ReportMonth = { year: number; month: number }; // month is 1–12

export type ReportRow = {
  applied_on: string; // YYYY-MM-DD, Swedish time
  title: string;
  company: string;
  location: string | null;
  status: string;
  source: string;
  ad_id: string | null; // Platsbanken ad number, when the job came from there
  apply_url: string | null;
};

const TZ = "Europe/Stockholm";

/** "2026-10" → { year: 2026, month: 10 }; anything else → null. */
export function parseMonth(value: string | null | undefined): ReportMonth | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

export const monthKey = ({ year, month }: ReportMonth) => `${year}-${String(month).padStart(2, "0")}`;

export function shiftMonth({ year, month }: ReportMonth, by: number): ReportMonth {
  const i = year * 12 + (month - 1) + by;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}

/** The date in Sweden, whatever the server's own time zone. */
function swedishDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * The month people most likely want: during the reporting window (1st–14th)
 * that's last month's report, after it the month in progress.
 */
export function defaultReportMonth(now = new Date()): ReportMonth {
  const d = swedishDate(now);
  return d.day <= 14 ? shiftMonth(d, -1) : { year: d.year, month: d.month };
}

export function monthName(m: ReportMonth, locale: Locale): string {
  const s = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(m.year, m.month - 1, 15)),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Applications sent in the given month (Swedish time), oldest first. Drafts are left out. */
export function reportRows(userId: string, m: ReportMonth): Promise<ReportRow[]> {
  const next = shiftMonth(m, 1);
  return sql<ReportRow>(
    `SELECT to_char(a.applied_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS applied_on,
            j.title, j.company, j.location, a.status::text AS status, j.source,
            CASE WHEN j.source = 'jobtech' THEN j.external_id END AS ad_id, j.apply_url
     FROM applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.user_id = $1 AND a.status <> 'draft' AND a.applied_at IS NOT NULL
       AND a.applied_at >= ($2::timestamp AT TIME ZONE '${TZ}')
       AND a.applied_at <  ($3::timestamp AT TIME ZONE '${TZ}')
     ORDER BY a.applied_at`,
    [userId, `${monthKey(m)}-01`, `${monthKey(next)}-01`],
  );
}

const SOURCE_LABEL: Record<string, string> = { jobtech: "Platsbanken" };
export const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? "Fitwise";

const HEADERS: Record<Locale, string[]> = {
  sv: ["Datum", "Tjänst", "Arbetsgivare", "Ort", "Annons-ID", "Var annonsen fanns", "Länk", "Status"],
  en: ["Date", "Job title", "Employer", "Location", "Ad ID", "Where the ad was", "Link", "Status"],
};

/**
 * A CSV file that opens correctly in Excel set to Swedish (semicolons, UTF-8 with
 * a byte-order mark so å ä ö survive) and in Google Sheets and Numbers.
 */
export function reportCsv(rows: ReportRow[], locale: Locale, statusLabel: (s: string) => string): string {
  const cell = (v: string | null) => {
    const s = (v ?? "").replace(/\r?\n/g, " ");
    // Quote everything; a leading = + - @ is neutralised so a cell can never run as a formula.
    return `"${(/^[=+\-@\t]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const lines = [HEADERS[locale], ...rows.map((r) => [r.applied_on, r.title, r.company, r.location, r.ad_id, sourceLabel(r.source), r.apply_url, statusLabel(r.status)])];
  return "﻿" + lines.map((l) => l.map(cell).join(";")).join("\r\n") + "\r\n";
}

/** Plain text for pasting into an email or notes, one application per line. */
export function reportText(rows: ReportRow[]): string {
  return rows
    .map((r) => [r.applied_on, r.title, r.company, r.location, r.ad_id ? `Platsbanken ${r.ad_id}` : null].filter(Boolean).join(" · "))
    .join("\n");
}
