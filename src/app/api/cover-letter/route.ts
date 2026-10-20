import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getJob, fitForJob, hasProfile, profileText } from "@/lib/matching";
import { generateCoverLetter } from "@/lib/ai/cover-letter";
import { one } from "@/lib/db";
import { useAiAllowance } from "@/lib/ai-usage";
import { localeFromRequest, say } from "@/i18n/server";

export const maxDuration = 60;

const Body = z.object({
  job_id: z.uuid(),
  tone: z.enum(["professional", "warm", "concise"]).default("professional"),
  language: z.enum(["sv", "en"]).optional().describe("Letter language; defaults to the site language"),
  notes: z.string().max(1000).optional().describe("Anything the user wants emphasized"),
  save: z.boolean().default(true).describe("Store on the application (created as draft if none)"),
});

/**
 * POST /api/cover-letter { job_id, tone?, notes?, save? }
 * The "Apply with AI" action. Grounded in the user's parsed resume and the
 * job's matched/missing skills. Saved to the application as a draft by default.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  if (!hasProfile(user)) throw new HttpError(409, say(req, "Upload a resume first", "Ladda upp ett CV först"));
  const body = Body.parse(await readJson(req));
  const job = await getJob(body.job_id);
  if (!job) throw new HttpError(404, say(req, "Job not found", "Jobbet hittades inte"));

  const fit = await fitForJob(user, job);
  const allowance = await useAiAllowance(user, "cover_letter", localeFromRequest(req));
  const letter = await generateCoverLetter({
    candidateName: user.name,
    profileText: user.resume_text || profileText(user),
    job,
    fit: { matchedSkills: fit?.matched_skills ?? [], missingSkills: fit?.missing_skills ?? [] },
    tone: body.tone,
    language: body.language ?? localeFromRequest(req),
    extraNotes: body.notes,
  }).catch(async (e) => {
    await allowance.refund(); // a failed generation shouldn't use up the user's allowance
    throw e;
  });

  let application = null;
  if (body.save) {
    application = await one(
      `INSERT INTO applications (user_id, job_id, cover_letter) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, job_id) DO UPDATE SET cover_letter = EXCLUDED.cover_letter
       RETURNING id, status`,
      [user.id, job.id, letter],
    );
  }
  return ok({ cover_letter: letter, application });
});
