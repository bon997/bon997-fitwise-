import { route, ok } from "@/lib/http";
import { getUser } from "@/lib/auth";
import { JobSearchQuery, searchJobs } from "@/lib/job-search";

/**
 * GET /api/jobs?q=react&location=stockholm&remote=true&type=full_time
 *              &seniority=senior&salary_min=600000&posted_within=14
 *              &min_fit=70&sort=relevance|recent|fit|salary&page=1&per_page=20
 * Public. When signed in with a resume, each job includes `fit`.
 */
export const GET = route(async (req: Request) => {
  const params = JobSearchQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const user = await getUser(req);
  return ok(await searchJobs(params, user));
});
