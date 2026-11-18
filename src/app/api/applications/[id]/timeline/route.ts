import { route, ok, HttpError, assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { sql, one } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/applications/:id/timeline — status changes, oldest first. */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Application");
  if (!(await one("SELECT 1 FROM applications WHERE id = $1 AND user_id = $2", [id, user.id]))) {
    throw new HttpError(404, "Application not found");
  }
  const events = await sql("SELECT status, at FROM application_events WHERE application_id = $1 ORDER BY at", [id]);
  return ok({ events });
});
