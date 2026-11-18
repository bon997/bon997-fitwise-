import { route, ok, HttpError } from "@/lib/http";
import { getUser, isCron } from "@/lib/auth";
import { appUrl } from "@/lib/google-oauth";
import { emailConfigured } from "@/lib/email";
import { runJobAlerts } from "@/lib/job-alerts";
import { backfillJobEducation } from "@/lib/ingest";

// Fits every Vercel plan; runJobAlerts stops in time and the next daily run carries on.
export const maxDuration = 60;

/**
 * GET /api/cron/job-alerts sends today's job alert emails: daily ones every
 * day, weekly ones on Mondays, monthly ones on the 1st (Stockholm dates; each
 * person's own settings decide). Called by Vercel Cron at 07:00 UTC (08:00 in
 * Stockholm in winter, 09:00 in summer; see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`; an admin can also open it by hand.
 *
 * With time left over, it reads the education requirement of a few older jobs
 * (the only other daily catch-up; Haiku, a few öre per run).
 */
export const GET = route(async (req: Request) => {
  if (!isCron(req) && (await getUser(req))?.role !== "admin") throw new HttpError(401, "Cron secret or admin required");
  const started = Date.now();
  const alerts = emailConfigured()
    ? await runJobAlerts(appUrl(req))
    : { skipped: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)" };
  const education =
    !process.env.ANTHROPIC_API_KEY?.trim() ? { education_skipped: "ANTHROPIC_API_KEY is not set" }
    : Date.now() - started > 35_000 ? { education_skipped: "No time left this run" }
    : await backfillJobEducation(20).catch(() => ({ education_read: 0, education_failed: 0 }));
  return ok({ ...alerts, ...education });
});
