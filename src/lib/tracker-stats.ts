/**
 * Application tracker statistics. Pure, so the page, the API and tests agree.
 *
 * "Sent" = anything past draft. "Reached interview" = was ever interviewing or got an offer
 * (from the timeline), so a rejection after an interview still counts as an interview.
 */
export type TrackerRow = {
  status: string;
  applied_at: Date | string | null;
  reached_interview: boolean;
};

export type TrackerStats = {
  saved: number;
  sent: number;
  active: number;
  waiting: number;
  interviews: number;
  offers: number;
  interview_rate: number | null; // % of sent, null until something is sent
  success_rate: number | null;
  this_week: number;
};

const DAY = 864e5;

export function trackerStats(rows: readonly TrackerRow[], now = Date.now()): TrackerStats {
  const sent = rows.filter((r) => r.status !== "draft");
  const interviews = sent.filter((r) => r.reached_interview || r.status === "interviewing" || r.status === "offer").length;
  const offers = sent.filter((r) => r.status === "offer").length;
  const pct = (n: number) => (sent.length ? Math.round((n / sent.length) * 100) : null);
  return {
    saved: rows.length - sent.length,
    sent: sent.length,
    active: sent.filter((r) => r.status === "applied" || r.status === "interviewing").length,
    waiting: sent.filter((r) => r.status === "applied").length,
    interviews,
    offers,
    interview_rate: pct(interviews),
    success_rate: pct(offers),
    this_week: sent.filter((r) => r.applied_at && now - new Date(r.applied_at).getTime() < 7 * DAY).length,
  };
}

/** SQL for the rows trackerStats needs, for one user ($1). */
export const TRACKER_ROWS_SQL = `
  SELECT a.status, a.applied_at,
         EXISTS (SELECT 1 FROM application_events e
                 WHERE e.application_id = a.id AND e.status IN ('interviewing', 'offer')) AS reached_interview
  FROM applications a WHERE a.user_id = $1`;
