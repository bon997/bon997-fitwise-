import { z } from "zod";
import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { recommendJobs, skillGaps, hasProfile } from "@/lib/matching";

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  days: z.coerce.number().int().min(1).max(60).default(7),
  min_score: z.coerce.number().int().min(0).max(100).default(0),
});

/**
 * GET /api/match?limit=20&days=7&min_score=60
 * Weekly matches for the dashboard, ranked by fit, plus the skills that
 * would most improve the user's scores and their suggested roles.
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  if (!hasProfile(user)) throw new HttpError(409, "Upload a resume first");
  const q = Query.parse(Object.fromEntries(new URL(req.url).searchParams));

  const matches = await recommendJobs(user, { limit: q.limit, days: q.days, minScore: q.min_score });
  return ok({
    matches,
    skill_gaps: await skillGaps(user.id),
    suggested_roles: user.preferences?.suggested_roles ?? [],
    resume_score: user.resume_score,
  });
});
