import { z } from "zod";
import { route, ok, readJson, HttpError, assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getJob, hasProfile } from "@/lib/matching";
import { PlanRequiredError } from "@/lib/plans";
import { useAiAllowance } from "@/lib/ai-usage";
import { getReport, saveReport, isStale } from "@/lib/ai-reports";
import { generateInterviewPack, type InterviewPack } from "@/lib/agents/interview";
import { candidateContext, coachAccess, jobContext, visiblePack } from "@/lib/interview";
import { localeFromRequest, say } from "@/i18n/server";

// A full pack is long; give the model time.
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/jobs/:id/interview-prep — the saved pack (first questions only without Premium). */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Job");
  const { access, pack } = await coachAccess(user, id);
  const stored = pack ? await getReport<InterviewPack>(user.id, id, "interview") : null;
  return ok({ access, pack: pack ? visiblePack(pack, access) : null, stale: stored ? isStale(stored, user.profile_updated_at) : false });
});

const Body = z.object({ refresh: z.boolean().default(false) }).default({ refresh: false });

/**
 * POST /api/jobs/:id/interview-prep { refresh? }
 * Writes the interview pack for this job (or returns the saved one while it is current).
 * Premium: every job. Others: one pack, of which they see the first questions.
 */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Job");
  const body = Body.parse(await readJson(req).catch(() => ({})));
  const locale = localeFromRequest(req);
  if (!hasProfile(user)) throw new HttpError(409, say(req, "Upload your CV first", "Ladda upp ditt CV först"));
  const job = await getJob(id);
  if (!job) throw new HttpError(404, say(req, "Job not found", "Jobbet hittades inte"));

  const { access } = await coachAccess(user, id);
  if (access === "locked") throw new PlanRequiredError("interview_coach", "premium");
  const stored = await getReport<InterviewPack>(user.id, id, "interview");
  const current = stored && !isStale(stored, user.profile_updated_at) && !(body.refresh && stored.locale !== locale);
  if (stored && current) return ok({ access, pack: visiblePack(stored.content, access), stale: false });
  // Rewriting a preview pack (CV changed, other language) is a Premium action.
  if (stored && access !== "full") throw new PlanRequiredError("interview_coach", "premium");

  const allowance = await useAiAllowance(user, "interview_prep", locale);
  const pack = await generateInterviewPack({ candidate: candidateContext(user), job: jobContext(job), locale }).catch(async (e) => {
    await allowance.refund();
    console.error("interview pack failed", e);
    throw new HttpError(502, say(req, "The interview pack couldn't be written right now. Try again in a minute.", "Intervjupaketet kunde inte skrivas just nu. Försök igen om en minut."));
  });
  if (pack.questions.length < 5) {
    await allowance.refund();
    throw new HttpError(502, say(req, "The interview pack came back incomplete. Try again.", "Intervjupaketet blev ofullständigt. Försök igen."));
  }
  await saveReport(user.id, id, "interview", pack, locale);
  return ok({ access, pack: visiblePack(pack, access), stale: false });
});
