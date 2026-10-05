import { z } from "zod";
import { route, ok, readJson, HttpError, assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { sql, one } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  reason: z.enum(["not_my_role", "wrong_location", "salary_too_low", "wrong_seniority", "company", "other"]).default("other"),
});

/**
 * POST /api/jobs/:id/dismiss { reason? } — "Not interested". Hides the job and
 * teaches the ranking (e.g. reason "company" hides all jobs from that company).
 */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Job");
  const { reason } = Body.parse(await readJson(req).catch(() => ({})));
  if (!(await one("SELECT 1 FROM jobs WHERE id = $1", [id]))) throw new HttpError(404, "Job not found");
  await sql(
    `INSERT INTO job_dismissals (user_id, job_id, reason) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, job_id) DO UPDATE SET reason = EXCLUDED.reason, created_at = now()`,
    [user.id, id, reason],
  );
  // A dismissed job shouldn't stay bookmarked.
  await sql("DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2", [user.id, id]);
  return ok({ dismissed: true, reason });
});

/** DELETE /api/jobs/:id/dismiss — undo. */
export const DELETE = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Job");
  await sql("DELETE FROM job_dismissals WHERE user_id = $1 AND job_id = $2", [user.id, id]);
  return new Response(null, { status: 204 });
});
