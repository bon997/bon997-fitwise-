import { route, ok, HttpError } from "@/lib/http";
import { getUser, isCron } from "@/lib/auth";
import { appUrl } from "@/lib/google-oauth";
import { emailConfigured } from "@/lib/email";
import { runJobAlerts } from "@/lib/job-alerts";
import { backfillJobEducation } from "@/lib/ingest";

// Fits every Vercel plan; runJobAlerts stops in time and the next daily run carries on.
export const maxDuration = 60;

/**
 * GET /api/cron/job-alerts sends this run's weekly job alert emails.
 * Called daily by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`;
 * an admin can also open it to run it by hand.
 *
 * It also reads the education requirement of up to 30 older jobs per day (the
 * only scheduled job, so the catch-up rides along; Haiku, a few öre per run).
 */
export const GET = route(async (req: Request) => {
  if (!isCron(req) && (await getUser(req))?.role !== "admin") throw new HttpError(401, "Cron secret or admin required");
  const education = process.env.ANTHROPIC_API_KEY?.trim()
    ? await backfillJobEducation(30).catch(() => ({ education_read: 0, education_failed: 0 }))
    : { education_skipped: "ANTHROPIC_API_KEY is not set" };
  if (!emailConfigured()) return ok({ ...education, skipped: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)" });
  return ok({ ...education, ...(await runJobAlerts(appUrl(req))) });
});
