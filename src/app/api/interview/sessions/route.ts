import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getJob, hasProfile } from "@/lib/matching";
import { requireFeature } from "@/lib/plans";
import { one } from "@/lib/db";
import { useAiAllowance } from "@/lib/ai-usage";
import { getReport } from "@/lib/ai-reports";
import { generateMockQuestions, pickMockQuestions, type InterviewPack } from "@/lib/agents/interview";
import { candidateContext, jobContext, publicSession, type SessionRow } from "@/lib/interview";
import { localeFromRequest, say } from "@/i18n/server";

export const maxDuration = 60;

const Body = z.object({ job_id: z.uuid() });

/**
 * POST /api/interview/sessions { job_id } — start a 5-question practice interview (Premium).
 * Questions come from the job's interview pack when there is one; otherwise they are written now.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  requireFeature(user, "interview_coach");
  if (!hasProfile(user)) throw new HttpError(409, say(req, "Upload your CV first", "Ladda upp ditt CV först"));
  const { job_id } = Body.parse(await readJson(req));
  const job = await getJob(job_id);
  if (!job) throw new HttpError(404, say(req, "Job not found", "Jobbet hittades inte"));
  const locale = localeFromRequest(req);

  const pack = await getReport<InterviewPack>(user.id, job.id, "interview");
  let questions = pack && pack.locale === locale ? pickMockQuestions(pack.content) : null;
  if (!questions) {
    const allowance = await useAiAllowance(user, "interview_turn", locale);
    questions = await generateMockQuestions({ candidate: candidateContext(user), job: jobContext(job), locale }).catch(async (e) => {
      await allowance.refund();
      console.error("mock questions failed", e);
      throw new HttpError(502, say(req, "The interview couldn't start right now. Try again in a minute.", "Intervjun kunde inte starta just nu. Försök igen om en minut."));
    });
  }
  const session = await one<SessionRow>(
    "INSERT INTO interview_sessions (user_id, job_id, questions, locale) VALUES ($1, $2, $3, $4) RETURNING *",
    [user.id, job.id, JSON.stringify(questions), locale],
  );
  return ok({ session: publicSession(session!) }, { status: 201 });
});
