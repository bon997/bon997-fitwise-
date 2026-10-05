/** Normalized shape every job source maps into before upsert. */
export type RawJob = {
  source: "serpapi" | "rapidapi";
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  employmentType: string | null;
  description: string;
  requirements: string;
  responsibilities: string[];
  salaryRange: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  applyUrl: string | null;
  postedAt: Date | null;
};

export type SearchParams = { query: string; location?: string; page?: number };

const PERIOD_TO_YEAR: Record<string, number> = { HOUR: 2080, DAY: 260, WEEK: 52, MONTH: 12, YEAR: 1 };

export function toYearly(amount: number | null | undefined, period: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  const mult = PERIOD_TO_YEAR[(period ?? "YEAR").toUpperCase()] ?? 1;
  return Math.round(amount * mult);
}

/** "3 days ago" / "an hour ago" → Date. Returns null if unparseable. */
export function parseRelativeDate(s: string | null | undefined, now = new Date()): Date | null {
  if (!s) return null;
  const m = s.toLowerCase().match(/(\d+|an?|one)\s+(minute|hour|day|week|month)s?\s+ago/);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
  const ms = { minute: 6e4, hour: 3.6e6, day: 8.64e7, week: 6.048e8, month: 2.592e9 }[m[2] as "day"];
  return new Date(now.getTime() - n * ms);
}

export function employmentType(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.toLowerCase().replace(/[\s-]+/g, "_");
  if (t.includes("full")) return "full_time";
  if (t.includes("part")) return "part_time";
  if (t.includes("contract") || t.includes("contractor")) return "contract";
  if (t.includes("intern")) return "internship";
  return t;
}
