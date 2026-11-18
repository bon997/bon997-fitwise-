import { z } from "zod";
import { route, ok, readJson, HttpError, assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getJob } from "@/lib/matching";
import { requireFeature } from "@/lib/plans";
import { one } from "@/lib/db";
import { useAiAllowance } from "@/lib/ai-usage";
import { evaluateAnswer, summarizeInterview, readiness } from "@/lib/agents/interview";
import { candidateContext, getSession, jobContext, publicSession, type SessionRow, type Turn } from "@/lib/interview";
import { localeFromRequest, say } from "@/i18n/server";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ answer: z.string().trim().min(1).max(4000), index: z.number().int().min(0) });

/**
 * POST /api/interview/sessions/:id/answer { answer, index }
 * Scores the answer to question `index` (1-5 with feedback and a stronger version).
 * After the last question it adds the summary and the readiness score (0-100).
 */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  requireFeature(user, "interview_coach");
  const { id } = await ctx.params;
  assertUuid(id, "Interview");
  const body = Body.parse(await readJson(req));
  const s = await getSession(id, user.id);
  if (!s) throw new HttpError(404, "Interview not found");
  // `index` guards against a double click sending the same answer twice.
  if (body.index !== s.turns.length || s.turns.length >= s.questions.length) {
    return ok({ session: publicSession(s) });
  }
  const job = await getJob(s.job_id);
  if (!job) throw new HttpError(404, "Job not found");
  const locale = localeFromRequest(req);
  const question = s.questions[body.index].question;

  const allowance = await useAiAllowance(user, "interview_turn", locale);
  const fail = async (e: unknown) => {
    await allowance.refund();
    console.error("interview answer failed", e);
    throw new HttpError(502, say(req, "Couldn't score that answer right now. Send it again.", "Kunde inte bedöma svaret just nu. Skicka det igen."));
  };
  const result = await evaluateAnswer({ candidate: candidateContext(user), job: jobContext(job), question, answer: body.answer, locale }).catch(fail);
  const turn: Turn = { answer: body.answer, ...result };

  const turns = [...s.turns, turn];
  let score: number | null = null;
  let summary = null;
  if (turns.length >= s.questions.length) {
    score = readiness(turns.map((t) => t.score));
    summary = await summarizeInterview({
      job: jobContext(job), locale,
      qa: turns.map((t, i) => ({ question: s.questions[i].question, answer: t.answer, score: t.score })),
    }).catch(() => ({ summary: "", strengths: [], improve: [] }));
  }

  const updated = await one<SessionRow>(
    `UPDATE interview_sessions SET turns = turns || $3::jsonb, score = $4, summary = $5, updated_at = now()
     WHERE id = $1 AND user_id = $2 AND jsonb_array_length(turns) = $6 RETURNING *`,
    [id, user.id, JSON.stringify([turn]), score, summary && JSON.stringify(summary), body.index],
  );
  return ok({ session: publicSession(updated ?? (await getSession(id, user.id))!) });
});
