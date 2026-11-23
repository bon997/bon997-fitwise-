import { one } from "./db";

/** Cached AI write-ups per user and job (gap report now; interview prep later). */
export type ReportKind = "gap" | "interview" | "letter";

export type StoredReport<T> = { content: T; created_at: Date; locale: string };

export async function getReport<T>(userId: string, jobId: string, kind: ReportKind): Promise<StoredReport<T> | null> {
  return one<StoredReport<T>>(
    "SELECT content, created_at, locale FROM ai_reports WHERE user_id = $1 AND job_id = $2 AND kind = $3",
    [userId, jobId, kind],
  );
}

export async function saveReport<T>(userId: string, jobId: string, kind: ReportKind, content: T, locale: string) {
  return one<StoredReport<T>>(
    `INSERT INTO ai_reports (user_id, job_id, kind, content, locale) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, job_id, kind) DO UPDATE SET content = EXCLUDED.content, locale = EXCLUDED.locale, created_at = now()
     RETURNING content, created_at, locale`,
    [userId, jobId, kind, JSON.stringify(content), locale],
  );
}

export async function countReports(userId: string, kind: ReportKind): Promise<number> {
  const r = await one<{ n: number }>("SELECT count(*)::int AS n FROM ai_reports WHERE user_id = $1 AND kind = $2", [userId, kind]);
  return r?.n ?? 0;
}

/** A report is out of date once the profile (CV, skills, experience) changed after it was written. */
export const isStale = (report: { created_at: Date | string }, profileUpdatedAt: Date | string | null) =>
  Boolean(profileUpdatedAt && new Date(profileUpdatedAt) > new Date(report.created_at));
