import { route, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { sql, one } from "@/lib/db";

/** GET /api/admin/stats — overview numbers and recent ingestion runs for the admin panel. */
export const GET = route(async (req: Request) => {
  await requireAdmin(req);
  const [totals, byStatus, runs] = await Promise.all([
    one(
      `SELECT
         (SELECT count(*)::int FROM users) AS users,
         (SELECT count(*)::int FROM users WHERE jsonb_array_length(skills) > 0) AS users_with_resume,
         (SELECT count(*)::int FROM jobs WHERE is_active) AS active_jobs,
         (SELECT count(*)::int FROM jobs WHERE is_active AND skills = '[]'::jsonb) AS jobs_pending_enrichment,
         (SELECT count(*)::int FROM jobs WHERE created_at > now() - interval '7 days') AS jobs_added_7d,
         (SELECT count(*)::int FROM applications) AS applications,
         (SELECT round(avg(score))::int FROM fit_scores) AS avg_fit_score`,
    ),
    sql("SELECT status, count(*)::int AS n FROM applications GROUP BY status ORDER BY status"),
    sql("SELECT * FROM ingest_runs ORDER BY started_at DESC LIMIT 20"),
  ]);
  return ok({ totals, applications_by_status: byStatus, ingest_runs: runs });
});
