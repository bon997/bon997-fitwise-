import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getJob, fitForJob, hasProfile } from "@/lib/matching";
import { publicFit } from "@/lib/data";

const Body = z.object({
  job_id: z.uuid(),
  explain: z.boolean().default(false),
});

/**
 * POST /api/fit-score { job_id, explain? }
 * Returns the cached score (recomputed if stale). With explain=true, adds a
 * short Claude-written explanation, cached until the score changes.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  if (!hasProfile(user)) throw new HttpError(409, "Upload a resume first");
  const body = Body.parse(await readJson(req));
  const job = await getJob(body.job_id);
  if (!job) throw new HttpError(404, "Job not found");
  return ok({ job_id: job.id, fit: publicFit(await fitForJob(user, job, { explain: body.explain })) });
});
