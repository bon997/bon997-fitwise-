import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { sql, one } from "@/lib/db";

/** GET /api/saved-jobs — bookmarked jobs, newest first, with fit score when available. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const jobs = await sql(
    `SELECT j.id, j.title, j.company, j.location, j.remote, j.salary_range, j.posted_at,
            s.created_at AS saved_at, f.score AS fit_score
     FROM saved_jobs s
     JOIN jobs j ON j.id = s.job_id
     LEFT JOIN fit_scores f ON f.user_id = s.user_id AND f.job_id = s.job_id
     WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
    [user.id],
  );
  return ok({ jobs });
});

const Body = z.object({ job_id: z.uuid() });

/** POST /api/saved-jobs { job_id } — idempotent. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { job_id } = Body.parse(await readJson(req));
  const job = await one("SELECT 1 FROM jobs WHERE id = $1", [job_id]);
  if (!job) throw new HttpError(404, "Job not found");
  await sql("INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [user.id, job_id]);
  // Saving contradicts an earlier "not interested", so drop it.
  await sql("DELETE FROM job_dismissals WHERE user_id = $1 AND job_id = $2", [user.id, job_id]);
  return ok({ saved: true }, { status: 201 });
});

/** DELETE /api/saved-jobs?job_id=… — idempotent. */
export const DELETE = route(async (req: Request) => {
  const user = await requireUser(req);
  const { job_id } = Body.parse({ job_id: new URL(req.url).searchParams.get("job_id") });
  await sql("DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2", [user.id, job_id]);
  return new Response(null, { status: 204 });
});
