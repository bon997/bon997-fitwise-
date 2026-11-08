import { route, ok, HttpError } from "@/lib/http";
import { getUser, isCron } from "@/lib/auth";
import { runScheduledImport } from "@/lib/scheduled-import";

// Fits every Vercel plan; the import stops in time and the next night carries on.
export const maxDuration = 60;

/**
 * GET /api/cron/import-jobs runs the saved daily searches (admin page → Daily imports).
 * Called nightly by Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`;
 * the admin page's "Run now" calls it as an admin.
 */
export const GET = route(async (req: Request) => {
  if (!isCron(req) && (await getUser(req))?.role !== "admin") throw new HttpError(401, "Cron secret or admin required");
  return ok(await runScheduledImport());
});
