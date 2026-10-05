import { route, ok, HttpError, assertUuid } from "@/lib/http";
import { getUser } from "@/lib/auth";
import { getJob, fitForJob, hasProfile } from "@/lib/matching";
import { one } from "@/lib/db";
import { publicFit } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/jobs/:id — full job; with a signed-in user, also fit + saved/application state. */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  assertUuid(id, "Job");
  const job = await getJob(id);
  if (!job) throw new HttpError(404, "Job not found");

  const user = await getUser(req);
  if (!user) return ok({ job, fit: null, saved: false, application: null });

  const [fit, saved, application] = await Promise.all([
    hasProfile(user) ? fitForJob(user, job) : null,
    one("SELECT 1 FROM saved_jobs WHERE user_id = $1 AND job_id = $2", [user.id, id]),
    one("SELECT id, status, applied_at FROM applications WHERE user_id = $1 AND job_id = $2", [user.id, id]),
  ]);
  return ok({ job, fit: publicFit(fit), saved: Boolean(saved), application });
});
