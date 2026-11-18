import { z } from "zod";
import { route, ok, readJson, HttpError, assertUuid } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getJob, fitForJob, hasProfile, profileText } from "@/lib/matching";
import { can, FREE_PREVIEWS, PlanRequiredError } from "@/lib/plans";
import { useAiAllowance } from "@/lib/ai-usage";
import { getReport, saveReport, countReports, isStale } from "@/lib/ai-reports";
import { generateGapReport, type GapReport } from "@/lib/agents/gap-report";
import { localeFromRequest, say } from "@/i18n/server";
import type { UserRow } from "@/lib/data";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/jobs/:id/gap-report — the saved report for this job, if any. */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  assertUuid(id, "Job");
  const report = await getReport<GapReport>(user.id, id, "gap");
  return ok({ report: report?.content ?? null, created_at: report?.created_at ?? null, stale: report ? isStale(report, user.profile_updated_at) : false });
});

const Body = z.object({ refresh: z.boolean().default(false) }).default({ refresh: false });

const educationText = (u: UserRow) =>
  (u.education ?? []).map((e) => [e.level, e.field].filter(Boolean).join(" in ")).join("; ");

/**
 * POST /api/jobs/:id/gap-report { refresh? }
 * Returns the saved report when it is still current; otherwise writes a new one.
 * Pro and Premium: unlimited (daily AI allowance applies). Basic: FREE_PREVIEWS reports in total.
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

  const existing = await getReport<GapReport>(user.id, job.id, "gap");
  const stale = existing ? isStale(existing, user.profile_updated_at) : false;
  if (existing && !stale && !(body.refresh && existing.locale !== locale)) {
    return ok({ report: existing.content, created_at: existing.created_at, stale: false });
  }
  // Basic: one free report. Rewriting that same report (CV changed, other language) stays free.
  if (!can(user, "gap_report") && !existing && (await countReports(user.id, "gap")) >= FREE_PREVIEWS.gap_report) {
    throw new PlanRequiredError("gap_report", "pro");
  }

  const fit = await fitForJob(user, job);
  const allowance = await useAiAllowance(user, "gap_report", locale);
  const report = await generateGapReport({
    profileText: user.resume_text || profileText(user),
    years: user.years_experience == null ? null : Number(user.years_experience),
    seniority: user.seniority,
    education: educationText(user),
    job: { title: job.title, company: job.company, description: job.description, requirements: job.requirements, skills: job.skills.map((s) => s.name) },
    fit: fit
      ? {
          score: fit.score,
          matched: fit.matched_skills,
          missing: fit.missing_skills,
          partial: ((fit.breakdown as { partial_skills?: string[] }).partial_skills ?? []),
        }
      : null,
    locale,
  }).catch(async (e) => {
    await allowance.refund();
    console.error("gap report failed", e);
    throw new HttpError(502, say(req, "The analysis couldn't be written right now. Try again in a minute.", "Analysen kunde inte skrivas just nu. Försök igen om en minut."));
  });
  const saved = await saveReport(user.id, job.id, "gap", report, locale);
  return ok({ report, created_at: saved?.created_at ?? new Date(), stale: false });
});
