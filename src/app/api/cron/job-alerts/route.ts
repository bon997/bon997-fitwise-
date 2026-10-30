import { route, ok, HttpError } from "@/lib/http";
import { getUser, isCron } from "@/lib/auth";
import { appUrl } from "@/lib/google-oauth";
import { emailConfigured } from "@/lib/email";
import { runJobAlerts } from "@/lib/job-alerts";

// Fits every Vercel plan; runJobAlerts stops in time and the next daily run carries on.
export const maxDuration = 60;

/**
 * GET /api/cron/job-alerts sends this run's weekly job alert emails.
 * Called daily by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`;
 * an admin can also open it to run it by hand.
 */
export const GET = route(async (req: Request) => {
  if (!isCron(req) && (await getUser(req))?.role !== "admin") throw new HttpError(401, "Cron secret or admin required");
  if (!emailConfigured()) return ok({ skipped: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)" });
  return ok(await runJobAlerts(appUrl(req)));
});
