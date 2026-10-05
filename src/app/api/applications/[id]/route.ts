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
  })
  .partial()
  .strict()
  .refine((b) => Object.keys(b).length > 0, "Nothing to update");

/** PATCH /api/applications/:id { status?, cover_letter?, notes? } — applied_at is set the first time it leaves draft. */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Application");
  const b = Patch.parse(await readJson(req));

  const row = await one(
    `UPDATE applications SET
       status       = coalesce($3::application_status, status),
       cover_letter = CASE WHEN $4 THEN $5 ELSE cover_letter END,
       notes        = CASE WHEN $6 THEN $7 ELSE notes END,
       applied_at   = CASE WHEN applied_at IS NULL AND coalesce($3::application_status, status) <> 'draft'
                           THEN now() ELSE applied_at END
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, user.id, b.status ?? null, "cover_letter" in b, b.cover_letter ?? null, "notes" in b, b.notes ?? null],
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
