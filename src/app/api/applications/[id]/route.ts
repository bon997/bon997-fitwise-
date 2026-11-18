import { z } from "zod";
import { route, ok, readJson, HttpError, assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { APPLICATION_STATUSES } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/applications/:id — includes the full cover letter. */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Application");
  const row = await one(
    `SELECT a.*, json_build_object('id', j.id, 'title', j.title, 'company', j.company, 'apply_url', j.apply_url) AS job
     FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = $1 AND a.user_id = $2`,
    [id, user.id],
  );
  if (!row) throw new HttpError(404, "Application not found");
  return ok({ application: row });
});

const Patch = z
  .object({
    status: z.enum(APPLICATION_STATUSES),
    cover_letter: z.string().max(10_000).nullable(),
    notes: z.string().max(5_000).nullable(),
    interview_at: z.iso.datetime({ offset: true }).nullable(),
    next_step: z.string().trim().max(200).nullable(),
  })
  .partial()
  .strict()
  .refine((b) => Object.keys(b).length > 0, "Nothing to update");

/**
 * PATCH /api/applications/:id { status?, cover_letter?, notes?, interview_at?, next_step? }
 * applied_at is set the first time it leaves draft; every status change adds a timeline event.
 */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Application");
  const b = Patch.parse(await readJson(req));
  // Setting an interview date on an application that's only applied moves it to "interviewing".
  const status = b.status ?? null;

  const row = await one(
    `WITH prev AS (SELECT status FROM applications WHERE id = $1 AND user_id = $2),
     upd AS (
       UPDATE applications SET
         status       = CASE
                          WHEN $3::application_status IS NOT NULL THEN $3::application_status
                          WHEN $8 AND $9::timestamptz IS NOT NULL AND status IN ('draft', 'applied') THEN 'interviewing'
                          ELSE status END,
         cover_letter = CASE WHEN $4 THEN $5 ELSE cover_letter END,
         notes        = CASE WHEN $6 THEN $7 ELSE notes END,
         interview_at = CASE WHEN $8 THEN $9::timestamptz ELSE interview_at END,
         next_step    = CASE WHEN $10 THEN $11 ELSE next_step END,
         applied_at   = CASE WHEN applied_at IS NULL AND coalesce($3::application_status, status) <> 'draft'
                             THEN now() ELSE applied_at END
       WHERE id = $1 AND user_id = $2 RETURNING *),
     ev AS (
       INSERT INTO application_events (application_id, user_id, status)
       SELECT upd.id, upd.user_id, upd.status FROM upd, prev WHERE upd.status <> prev.status
       RETURNING 1)
     SELECT upd.* FROM upd`,
    [
      id, user.id, status, "cover_letter" in b, b.cover_letter ?? null, "notes" in b, b.notes ?? null,
      "interview_at" in b, b.interview_at ?? null, "next_step" in b, b.next_step || null,
    ],
  );
  if (!row) throw new HttpError(404, "Application not found");
  return ok({ application: row });
});

/** DELETE /api/applications/:id */
export const DELETE = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Application");
  const row = await one("DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id", [id, user.id]);
  if (!row) throw new HttpError(404, "Application not found");
  return new Response(null, { status: 204 });
});
