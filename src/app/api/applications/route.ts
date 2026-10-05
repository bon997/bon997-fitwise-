import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { sql, one } from "@/lib/db";
import { APPLICATION_STATUSES } from "@/lib/data";

const STATUSES = APPLICATION_STATUSES;

/**
 * GET /api/applications?status=applied
 * The tracker: applications with job summary and fit score, plus counts per status.
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const status = z.enum(STATUSES).optional().parse(new URL(req.url).searchParams.get("status") ?? undefined);

  const [applications, counts] = await Promise.all([
    sql(
      `SELECT a.id, a.status, a.notes, a.applied_at, a.created_at, a.updated_at,
              (a.cover_letter IS NOT NULL) AS has_cover_letter,
              json_build_object('id', j.id, 'title', j.title, 'company', j.company, 'location', j.location,
                                'remote', j.remote, 'apply_url', j.apply_url) AS job,
              f.score AS fit_score
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN fit_scores f ON f.user_id = a.user_id AND f.job_id = a.job_id
       WHERE a.user_id = $1 AND ($2::application_status IS NULL OR a.status = $2)
       ORDER BY a.updated_at DESC`,
      [user.id, status ?? null],
    ),
    sql<{ status: string; n: number }>(
      "SELECT status, count(*)::int AS n FROM applications WHERE user_id = $1 GROUP BY status",
      [user.id],
    ),
  ]);
  return ok({
    applications,
    counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?.n ?? 0])),
  });
});

const Create = z.object({
  job_id: z.uuid(),
  status: z.enum(STATUSES).default("applied"),
  cover_letter: z.string().max(10_000).optional(),
  notes: z.string().max(5_000).optional(),
});

/** POST /api/applications { job_id, status?, cover_letter?, notes? } — 409 if one exists (use PATCH). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const body = Create.parse(await readJson(req));
  const job = await one("SELECT 1 FROM jobs WHERE id = $1", [body.job_id]);
  if (!job) throw new HttpError(404, "Job not found");

  const row = await one(
    `INSERT INTO applications (user_id, job_id, status, cover_letter, notes, applied_at)
     VALUES ($1, $2, $3::application_status, $4, $5, CASE WHEN $3::application_status <> 'draft' THEN now() END)
     ON CONFLICT (user_id, job_id) DO NOTHING
     RETURNING *`,
    [user.id, body.job_id, body.status, body.cover_letter ?? null, body.notes ?? null],
  );
  if (!row) throw new HttpError(409, "You already have an application for this job");
  return ok({ application: row }, { status: 201 });
});
