/**
 * Job alert emails: "Today's Top 3 Logistics Jobs Matching Your Profile".
 *
 * Each person chooses (src/lib/alert-settings.ts) how often — daily, weekly
 * (Mondays) or monthly (the 1st) — how many jobs, which categories, a city and
 * radius, and a minimum match. One scheduled run a day (Vercel Cron, 08:00
 * Stockholm time) picks the people due today, finds the best jobs posted since
 * their last alert with the same ranking as the dashboard, filters them by
 * those settings and emails them. Nothing good means no email that day.
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
import { can } from "./plans";
import { alertSettingsFor, alertSubject, inArea, inCategories, isDue, WINDOW_DAYS, type AlertSettings } from "./alert-settings";
import type { Locale } from "@/i18n/config";

/** People looked at per run (the due ones among them get an email). */
export const ALERT_BATCH = 300;
/** Stop starting new people after this long, inside the route's 60-second limit; the next run continues. */
export const ALERT_TIME_BUDGET_MS = 45_000;

export type AlertJob = {
  job: Pick<JobRow, "id" | "title" | "company" | "location" | "remote" | "salary_range"> &
    Partial<Pick<JobRow, "apply_url" | "application_deadline">>;
  fit: { score: number; matched_skills: string[]; missing_skills: string[] };
  /** Distance from the chosen city, when known. */
  km?: number | null;
};

const COPY = {
  en: {
    pre: (top: string) => `Best match: ${top}`,
    hi: (n: string | null) => (n ? `Hi ${n},` : "Hi,"),
    intro: "Here are the best new jobs for your profile and settings, ranked by how well you match.",
    fit: "match",
    youHave: "You have",
    missing: "Missing",
    view: "See the job",
    apply: "Apply",
    details: "Details",
    deadline: (d: string) => `Apply by ${d}`,
    km: (n: number) => `${n} km away`,
    settings: "Change what you get",
    all: "See all your matches",
    why: "You get this because job alerts are on for your JobFitwise account.",
    off: "Turn off job alerts",
    remote: "Remote",
  },
  sv: {
    pre: (top: string) => `Bästa matchning: ${top}`,
    hi: (n: string | null) => (n ? `Hej ${n},` : "Hej,"),
    intro: "Här är de bästa nya jobben för din profil och dina inställningar, rankade efter hur väl du matchar.",
    fit: "match",
    youHave: "Du har",
    missing: "Saknas",
    view: "Visa jobbet",
    apply: "Sök",
    details: "Detaljer",
    deadline: (d: string) => `Sök senast ${d}`,
    km: (n: number) => `${n} km bort`,
    settings: "Ändra vad du får",
    all: "Visa alla dina matchningar",
    why: "Du får det här eftersom jobbtips är påslaget för ditt JobFitwise-konto.",
    off: "Stäng av jobbtips",
    remote: "Distans",
  },
};

/** The page with a "Turn off" button (link scanners that open links can't turn alerts off by accident). */
export const unsubscribeUrl = (base: string, token: string) => `${base}/unsubscribe?t=${encodeURIComponent(token)}`;
/** Where mail apps POST their one-click Unsubscribe (RFC 8058). */
export const oneClickUrl = (base: string, token: string) => `${base}/api/alerts/unsubscribe?t=${encodeURIComponent(token)}`;

export function alertEmail({ name, jobs, locale, base, alertsToken, settings = { frequency: "weekly", categories: [] } }: {
  name: string | null; jobs: AlertJob[]; locale: Locale; base: string; alertsToken: string;
  settings?: Pick<AlertSettings, "frequency" | "categories">;
}) {
  const c = COPY[locale];
  const day = (d: Date | string) => new Date(d).toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" });
  const applyHref = (j: AlertJob["job"]) => j.apply_url || `${base}/jobs/${j.id}`;
  const first = name?.trim().split(/\s+/)[0] ?? null;
  const off = unsubscribeUrl(base, alertsToken);
  const color = (s: number) => (s >= 75 ? "#1d6b52" : s >= 60 ? "#94500f" : "#5c6068");
  const place = (j: AlertJob["job"]) => [j.location, j.remote && !/remote|distans/i.test(j.location ?? "") ? c.remote : null].filter(Boolean).join(" · ");
  const skills = (list: string[]) => list.slice(0, 4).map(skillLabel).join(", ");

  const cards = jobs
    .map(({ job, fit, km }) => {
      const meta = [job.company, place(job), km != null ? c.km(km) : null, job.salary_range].filter(Boolean).join(" · ");
      const deadline = job.application_deadline ? c.deadline(day(job.application_deadline)) : null;
      return `<tr><td style="padding:16px 0;border-top:1px solid #dcd8cf">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top">
<a href="${esc(`${base}/jobs/${job.id}`)}" style="color:#15171c;font-weight:600;font-size:16px;text-decoration:none">${esc(job.title)}</a>
<div style="margin-top:2px;font-size:13px;color:#5c6068">${esc(meta)}</div>
${fit.matched_skills.length ? `<div style="margin-top:8px;font-size:13px;color:#1d6b52">✓ ${esc(c.youHave)}: ${esc(skills(fit.matched_skills))}</div>` : ""}
${fit.missing_skills.length ? `<div style="margin-top:2px;font-size:13px;color:#94500f">+ ${esc(c.missing)}: ${esc(skills(fit.missing_skills))}</div>` : ""}
${deadline ? `<div style="margin-top:6px;font-size:13px;font-weight:600;color:#15171c">${esc(deadline)}</div>` : ""}
<div style="margin-top:10px;font-size:13px"><a href="${esc(applyHref(job))}" style="display:inline-block;background:#15171c;color:#f5f3ee;text-decoration:none;padding:7px 14px;border-radius:999px;font-weight:600">${esc(c.apply)}</a>
&nbsp;&nbsp;<a href="${esc(`${base}/jobs/${job.id}`)}" style="color:#1d6b52">${esc(c.details)}</a></div>
</td>
<td style="vertical-align:top;text-align:right;padding-left:12px;white-space:nowrap">
<div style="font-size:22px;font-weight:700;color:${color(fit.score)}">${fit.score}%</div>
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
    footer: `${esc(c.why)}<br><a href="${esc(`${base}/profile#alerts-heading`)}" style="color:#5c6068">${esc(c.settings)}</a> · <a href="${esc(off)}" style="color:#5c6068">${esc(c.off)}</a>`,
  });

  const text = [
    c.hi(first),
    "",
    c.intro,
    "",
    ...jobs.map(({ job, fit, km }) =>
      [
        `${job.title} (${fit.score}% ${c.fit})`,
        [job.company, place(job), km != null ? c.km(km) : null, job.salary_range].filter(Boolean).join(" · "),
        job.application_deadline ? c.deadline(day(job.application_deadline)) : "",
        `${c.apply}: ${applyHref(job)}`,
        "",
      ].filter((l, i, a) => l !== "" || i === a.length - 1).join("\n"),
    ),
    `${c.all}: ${base}/jobs?sort=for_you`,
    "",
    c.why,
    `${c.settings}: ${base}/profile#alerts-heading`,
    `${c.off}: ${off}`,
  ].join("\n");

  return {
    subject: alertSubject(settings, jobs.length, locale),
    html,
    text,
    // RFC 8058 one-click unsubscribe: mail apps POST to this URL with no page in between.
    headers: { "List-Unsubscribe": `<${oneClickUrl(base, alertsToken)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

/**
 * The jobs worth emailing: new since the last alert (or within the frequency's
 * window), not already applied to or saved, at or above the minimum match, in
 * the chosen categories and area, best first, up to the chosen count.
 * `preview` ignores "since the last alert" so the settings page can show an example.
 */
export async function alertJobs(user: UserRow, settings = alertSettingsFor(user.preferences), opts: { preview?: boolean } = {}): Promise<AlertJob[]> {
  if (!hasProfile(user)) return [];
  const windowStart = new Date(Date.now() - WINDOW_DAYS[settings.frequency] * 86_400_000);
  const since = opts.preview || !user.job_alert_checked_at ? windowStart : user.job_alert_checked_at;
  const days = Math.min(40, Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86_400_000)));
  const [matches, seen] = await Promise.all([
    recommendJobs(user, { limit: 50, days, minScore: settings.min_match }),
    sql<{ job_id: string }>(
      "SELECT job_id FROM applications WHERE user_id = $1 UNION SELECT job_id FROM saved_jobs WHERE user_id = $1",
      [user.id],
    ),
  ]);
  const skip = new Set(seen.map((r) => r.job_id));
  const out: AlertJob[] = [];
  for (const m of matches) {
    if (skip.has(m.job.id) || m.fit.score < settings.min_match) continue;
    // recommendJobs limits to the window by posting (or import) date; this trims it to "since the last alert".
    if (m.job.posted_at && new Date(m.job.posted_at) <= since) continue;
    if (!inCategories(m.job, settings.categories)) continue;
    const area = inArea(m.job, settings);
    if (!area.ok) continue;
    // "0 km" reads oddly; distance is shown only when the job is outside the city itself.
    out.push({ job: m.job, fit: m.fit, km: area.km != null && area.km >= 5 ? area.km : null });
    if (out.length >= settings.count) break;
  }
  return out;
}

export type AlertRunResult = { checked: number; sent: number; nothingNew: number; failed: number; notDue: number; outOfTime: boolean };

/** One scheduled run. Safe to call more than once a day: nobody gets two alerts on the same day. */
export async function runJobAlerts(base: string, batch = ALERT_BATCH, now = new Date()): Promise<AlertRunResult> {
  const users = await sql<UserRow>(
    `SELECT * FROM users
     WHERE job_alerts AND email_verified_at IS NOT NULL AND jsonb_array_length(skills) > 0
       AND (job_alert_checked_at IS NULL OR job_alert_checked_at < now() - interval '12 hours')
     ORDER BY job_alert_checked_at NULLS FIRST
     LIMIT $1`,
    [batch],
  );
  const result: AlertRunResult = { checked: 0, sent: 0, nothingNew: 0, failed: 0, notDue: 0, outOfTime: false };
  const started = Date.now();
  for (const user of users) {
    // Alerts are a Pro feature; someone who dropped to Basic simply stops getting them.
    if (!can(user, "job_alerts", now)) {
      result.notDue++;
      continue;
    }
    const settings = alertSettingsFor(user.preferences);
    if (!isDue(settings.frequency, user.job_alert_checked_at, now)) {
      result.notDue++;
      continue;
    }
    if (Date.now() - started > ALERT_TIME_BUDGET_MS) {
      result.outOfTime = true;
      break;
    }
    result.checked++;
    try {
      const jobs = await alertJobs(user, settings);
      if (jobs.length > 0) {
        const locale: Locale = user.locale === "sv" ? "sv" : "en";
        await sendEmail({ to: user.email, ...alertEmail({ name: user.name, jobs, locale, base, alertsToken: user.alerts_token, settings }) });
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

