/**
 * Weekly "new jobs that fit you" emails.
 *
 * A scheduled run (Vercel Cron, daily) picks people who haven't been checked
 * for a week, finds the best jobs posted since their last check with the same
 * ranking as the dashboard, and emails up to five. Nobody gets more than one
 * alert a week, and a week with nothing good sends nothing.
 *
 * Only confirmed addresses get alerts, every email has a one-click "turn off"
 * link (also as a List-Unsubscribe header, which Gmail and Outlook show as an
 * Unsubscribe button), and the setting is on the profile page.
 */
import { sql } from "./db";
import { emailButton, emailLayout, esc, sendEmail } from "./email";
import { hasProfile, recommendJobs } from "./matching";
import { skillLabel } from "./format";
import type { JobRow, UserRow } from "./data";
import type { Locale } from "@/i18n/config";

export const ALERT_EVERY_DAYS = 7;
export const ALERT_MAX_JOBS = 5;
/** Below this fit, a job isn't worth an email. */
export const ALERT_MIN_FIT = 55;
/** People handled per run; the daily schedule spreads larger user bases over the week. */
export const ALERT_BATCH = 100;
/** Stop starting new people after this long, inside the route's 60-second limit; the next run continues. */
export const ALERT_TIME_BUDGET_MS = 45_000;

export type AlertJob = {
  job: Pick<JobRow, "id" | "title" | "company" | "location" | "remote" | "salary_range">;
  fit: { score: number; matched_skills: string[]; missing_skills: string[] };
};

const COPY = {
  en: {
    subject: (n: number) => (n === 1 ? "1 new job that fits you" : `${n} new jobs that fit you`),
    pre: (top: string) => `Best match this week: ${top}`,
    hi: (n: string | null) => (n ? `Hi ${n},` : "Hi,"),
    intro: "Here are the best jobs posted since your last update, ranked by how well you fit.",
    fit: "fit",
    youHave: "You have",
    missing: "Missing",
    view: "See the job",
    all: "See all your matches",
    why: "You get this weekly because job alerts are on for your Fitwise account.",
    off: "Turn off job alerts",
    remote: "Remote",
  },
  sv: {
    subject: (n: number) => (n === 1 ? "1 nytt jobb som passar dig" : `${n} nya jobb som passar dig`),
    pre: (top: string) => `Veckans bästa matchning: ${top}`,
    hi: (n: string | null) => (n ? `Hej ${n},` : "Hej,"),
    intro: "Här är de bästa jobben som publicerats sedan förra utskicket, rankade efter hur väl du passar.",
    fit: "match",
    youHave: "Du har",
    missing: "Saknas",
    view: "Visa jobbet",
    all: "Visa alla dina matchningar",
    why: "Du får det här varje vecka eftersom jobbtips är påslaget för ditt Fitwise-konto.",
    off: "Stäng av jobbtips",
    remote: "Distans",
  },
};

/** The page with a "Turn off" button (link scanners that open links can't turn alerts off by accident). */
export const unsubscribeUrl = (base: string, token: string) => `${base}/unsubscribe?t=${encodeURIComponent(token)}`;
/** Where mail apps POST their one-click Unsubscribe (RFC 8058). */
export const oneClickUrl = (base: string, token: string) => `${base}/api/alerts/unsubscribe?t=${encodeURIComponent(token)}`;

export function alertEmail({ name, jobs, locale, base, alertsToken }: { name: string | null; jobs: AlertJob[]; locale: Locale; base: string; alertsToken: string }) {
  const c = COPY[locale];
  const first = name?.trim().split(/\s+/)[0] ?? null;
  const off = unsubscribeUrl(base, alertsToken);
  const color = (s: number) => (s >= 75 ? "#1d6b52" : s >= 60 ? "#94500f" : "#5c6068");
  const place = (j: AlertJob["job"]) => [j.location, j.remote && !/remote|distans/i.test(j.location ?? "") ? c.remote : null].filter(Boolean).join(" · ");
  const skills = (list: string[]) => list.slice(0, 4).map(skillLabel).join(", ");

  const cards = jobs
    .map(({ job, fit }) => {
      const meta = [job.company, place(job), job.salary_range].filter(Boolean).join(" · ");
      return `<tr><td style="padding:16px 0;border-top:1px solid #dcd8cf">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top">
<a href="${esc(`${base}/jobs/${job.id}`)}" style="color:#15171c;font-weight:600;font-size:16px;text-decoration:none">${esc(job.title)}</a>
<div style="margin-top:2px;font-size:13px;color:#5c6068">${esc(meta)}</div>
${fit.matched_skills.length ? `<div style="margin-top:8px;font-size:13px;color:#1d6b52">✓ ${esc(c.youHave)}: ${esc(skills(fit.matched_skills))}</div>` : ""}
${fit.missing_skills.length ? `<div style="margin-top:2px;font-size:13px;color:#94500f">+ ${esc(c.missing)}: ${esc(skills(fit.missing_skills))}</div>` : ""}
</td>
<td style="vertical-align:top;text-align:right;padding-left:12px;white-space:nowrap">
<div style="font-size:22px;font-weight:700;color:${color(fit.score)}">${fit.score}</div>
<div style="font-size:11px;color:#5c6068;text-transform:uppercase;letter-spacing:.05em">${esc(c.fit)}</div>
</td></tr></table></td></tr>`;
    })
    .join("");

  const html = emailLayout({
    preheader: c.pre(`${jobs[0].job.title}, ${jobs[0].job.company}`),
    body: `<p style="margin:0 0 10px">${esc(c.hi(first))}</p>
<p style="margin:0 0 6px">${esc(c.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
<p style="margin:18px 0 0">${emailButton(`${base}/jobs?sort=for_you`, c.all)}</p>`,
    footer: `${esc(c.why)}<br><a href="${esc(off)}" style="color:#5c6068">${esc(c.off)}</a>`,
  });

  const text = [
    c.hi(first),
    "",
    c.intro,
    "",
    ...jobs.map(({ job, fit }) =>
      [`${job.title} (${fit.score} ${c.fit})`, [job.company, place(job), job.salary_range].filter(Boolean).join(" · "), `${base}/jobs/${job.id}`, ""].join("\n"),
    ),
    `${c.all}: ${base}/jobs?sort=for_you`,
    "",
    c.why,
    `${c.off}: ${off}`,
  ].join("\n");

  return {
    subject: c.subject(jobs.length),
    html,
    text,
    // RFC 8058 one-click unsubscribe: mail apps POST to this URL with no page in between.
    headers: { "List-Unsubscribe": `<${oneClickUrl(base, alertsToken)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

/** The jobs worth emailing: new since the last check, not already applied to or saved, good enough fit. */
export async function alertJobs(user: UserRow): Promise<AlertJob[]> {
  if (!hasProfile(user)) return [];
  const since = user.job_alert_checked_at ?? new Date(Date.now() - ALERT_EVERY_DAYS * 86_400_000);
  const days = Math.min(ALERT_EVERY_DAYS * 2, Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86_400_000)));
  const [matches, seen] = await Promise.all([
    recommendJobs(user, { limit: 30, days, minScore: ALERT_MIN_FIT }),
    sql<{ job_id: string }>(
      "SELECT job_id FROM applications WHERE user_id = $1 UNION SELECT job_id FROM saved_jobs WHERE user_id = $1",
      [user.id],
    ),
  ]);
  const skip = new Set(seen.map((r) => r.job_id));
  return matches
    .filter((m) => !skip.has(m.job.id))
    // recommendJobs already limits to the window by posting (or import) date; this trims it to "since the last check".
    .filter((m) => !m.job.posted_at || new Date(m.job.posted_at) > since)
    .slice(0, ALERT_MAX_JOBS)
    .map((m) => ({ job: m.job, fit: m.fit }));
}

export type AlertRunResult = { checked: number; sent: number; nothingNew: number; failed: number; outOfTime: boolean };

/** One scheduled run. Safe to call more than once a day: people checked this week are skipped. */
export async function runJobAlerts(base: string, batch = ALERT_BATCH): Promise<AlertRunResult> {
  const users = await sql<UserRow>(
    `SELECT * FROM users
     WHERE job_alerts AND email_verified_at IS NOT NULL AND jsonb_array_length(skills) > 0
       AND (job_alert_checked_at IS NULL OR job_alert_checked_at < now() - make_interval(days => $1))
     ORDER BY job_alert_checked_at NULLS FIRST
     LIMIT $2`,
    [ALERT_EVERY_DAYS, batch],
  );
  const result: AlertRunResult = { checked: 0, sent: 0, nothingNew: 0, failed: 0, outOfTime: false };
  const started = Date.now();
  for (const user of users) {
    if (Date.now() - started > ALERT_TIME_BUDGET_MS) {
      result.outOfTime = true;
      break;
    }
    result.checked++;
    try {
      const jobs = await alertJobs(user);
      if (jobs.length > 0) {
        const locale: Locale = user.locale === "sv" ? "sv" : "en";
        await sendEmail({ to: user.email, ...alertEmail({ name: user.name, jobs, locale, base, alertsToken: user.alerts_token }) });
        result.sent++;
      } else {
        result.nothingNew++;
      }
      await sql("UPDATE users SET job_alert_checked_at = now() WHERE id = $1", [user.id]);
    } catch (e) {
      // Left unchecked, so the next run tries this person again.
      result.failed++;
      console.error("job alert failed", user.id, e);
    }
  }
  return result;
}

/** Turns alerts off for whoever holds this link. Returns false for an unknown link. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!/^[0-9a-f]{20,64}$/.test(token)) return false;
  const row = await sql("UPDATE users SET job_alerts = false WHERE alerts_token = $1 RETURNING 1", [token]);
  return row.length > 0;
}

