import { route, ok, HttpError, assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getSession, publicSession } from "@/lib/interview";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/interview/sessions/:id */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Interview");
  const s = await getSession(id, user.id);
  if (!s) throw new HttpError(404, "Interview not found");
  return ok({ session: publicSession(s) });
});
