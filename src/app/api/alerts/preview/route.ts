import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { hasProfile } from "@/lib/matching";
import { alertJobs } from "@/lib/job-alerts";
import { AlertSettingsSchema } from "@/lib/alert-settings";

/**
 * POST /api/alerts/preview { frequency, count, categories, city, radius_km, min_match }
 * The jobs an alert with these settings would contain right now (recent jobs,
 * ignoring "since the last alert"), so the settings page can show an example
 * before saving. Uses the cached fit scores; no AI calls and no email.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  if (!hasProfile(user)) throw new HttpError(409, "Add your CV or skills first");
  const settings = AlertSettingsSchema.parse(await readJson(req));
  const jobs = await alertJobs(user, settings, { preview: true });
  return ok({
    jobs: jobs.map(({ job, fit, km }) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote,
      salary: job.salary_range,
      deadline: job.application_deadline ?? null,
      score: fit.score,
      km: km ?? null,
    })),
  });
});
