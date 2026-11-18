import { route, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { trackerStats, TRACKER_ROWS_SQL, type TrackerRow } from "@/lib/tracker-stats";

/** GET /api/applications/stats — totals, interview rate, success rate, active, waiting for reply. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  return ok({ stats: trackerStats(await sql<TrackerRow>(TRACKER_ROWS_SQL, [user.id])) });
});
