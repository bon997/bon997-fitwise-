import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/plans";
import { getJob, fitForJob, hasProfile, profileText } from "@/lib/matching";
import { generateApplicationPack } from "@/lib/ai/application-pack";
import { saveReport } from "@/lib/ai-reports";
import { one } from "@/lib/db";
import { useAiAllowance } from "@/lib/ai-usage";
import { localeFromRequest, say } from "@/i18n/server";

// The full pack (letter, analysis, keywords, Swedish email) is written by the larger model.
export const maxDuration = 120;

const Body = z.object({
  job_id: z.uuid(),
  tone: z.enum(["professional", "warm", "concise"]).default("professional"),
  language: z.enum(["sv", "en"]).optional().describe("Letter language; defaults to the site language"),
  achievements: z.string().trim().max(1500).optional().describe("Key achievements with results to use"),
  company: z.string().trim().max(3000).optional().describe("Company mission, values and culture, pasted from its website"),
  notes: z.string().trim().max(1000).optional().describe("Older clients: anything to emphasise (treated as achievements)"),
  save: z.boolean().default(true).describe("Store on the application (created as draft if none)"),
});

/**
 * POST /api/cover-letter { job_id, tone?, language?, achievements?, company?, save? }
 * Writes the application pack: a tailored cover letter grounded in the user's CV, the recruiter
 * analysis of the job's top requirements, ATS keywords and a 3-sentence Swedish email.
 * The letter is saved on the application (draft if new); the pack is kept for the job page.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  requireFeature(user, "cover_letters");
  if (!hasProfile(user)) throw new HttpError(409, say(req, "Upload a resume first", "Ladda upp ett CV först"));
  const body = Body.parse(await readJson(req));
  const job = await getJob(body.job_id);
  if (!job) throw new HttpError(404, say(req, "Job not found", "Jobbet hittades inte"));

  const siteLocale = localeFromRequest(req);
  const fit = await fitForJob(user, job);
  const allowance = await useAiAllowance(user, "cover_letter", siteLocale);
  const pack = await generateApplicationPack({
    candidateName: user.name,
    profileText: user.resume_text || profileText(user),
    job,
    fit: { matchedSkills: fit?.matched_skills ?? [], missingSkills: fit?.missing_skills ?? [] },
    tone: body.tone,
    language: body.language ?? siteLocale,
    noteLanguage: siteLocale,
    achievements: body.achievements || body.notes || undefined,
    companyText: body.company || undefined,
  }).catch(async (e) => {
    await allowance.refund(); // a failed generation shouldn't use up the user's allowance
    console.error("cover letter failed", e);
    throw new HttpError(502, say(req, "The letter couldn't be written right now. Try again in a minute.", "Brevet kunde inte skrivas just nu. Försök igen om en minut."));
  });
  if (!pack.letter) {
    await allowance.refund();
    throw new HttpError(502, say(req, "The letter came back empty. Try again.", "Brevet blev tomt. Försök igen."));
  }

  await saveReport(user.id, job.id, "letter", pack, body.language ?? siteLocale);
  let application = null;
  if (body.save) {
    application = await one(
      `WITH up AS (
         INSERT INTO applications (user_id, job_id, cover_letter) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, job_id) DO UPDATE SET cover_letter = EXCLUDED.cover_letter
         RETURNING id, status, user_id, (xmax = 0) AS inserted),
       ev AS (INSERT INTO application_events (application_id, user_id, status)
              SELECT id, user_id, status FROM up WHERE inserted RETURNING 1)
       SELECT id, status FROM up`,
      [user.id, job.id, pack.letter],
    );
  }
  return ok({ cover_letter: pack.letter, pack, application });
});
