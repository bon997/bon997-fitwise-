import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { hasProfile, profileText } from "@/lib/matching";
import { can, PlanRequiredError } from "@/lib/plans";
import { useAiAllowance } from "@/lib/ai-usage";
import { generateCareerPlan } from "@/lib/agents/career";
import { getCareerPlan, saveCareerPlan, visiblePlan, openJobCounts, planRoles } from "@/lib/career";
import { isStale } from "@/lib/ai-reports";
import { localeFromRequest, say } from "@/i18n/server";
import type { UserRow } from "@/lib/data";

// The plan is written with the larger model; give it time.
export const maxDuration = 120;

const educationText = (u: UserRow) =>
  (u.education ?? []).map((e) => [e.level, e.field].filter(Boolean).join(" in ")).join("; ");

/** GET /api/career-plan — the saved plan (path and first steps only without Premium) and open-job counts. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const stored = await getCareerPlan(user.id);
  if (!stored) return ok({ plan: null });
  return ok({
    plan: visiblePlan(stored.plan, user),
    target_role: stored.target_role, horizon: stored.horizon, created_at: stored.created_at,
    stale: isStale(stored, user.profile_updated_at),
    open_jobs: await openJobCounts(planRoles(stored.plan)),
  });
});

const Body = z.object({
  target_role: z.string().trim().max(80).optional().transform((s) => s || null),
  horizon: z.union([z.literal(1), z.literal(3), z.literal(5)]).default(3),
});

/**
 * POST /api/career-plan { target_role?, horizon? (1|3|5 years) }
 * Writes a new career plan. Premium: any time (daily AI limit). Others: one plan, shown as a preview.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const body = Body.parse(await readJson(req).catch(() => ({})));
  const locale = localeFromRequest(req);
  if (!hasProfile(user)) throw new HttpError(409, say(req, "Upload your CV first", "Ladda upp ditt CV först"));
  if (!can(user, "career_coach") && (await getCareerPlan(user.id))) throw new PlanRequiredError("career_coach", "premium");

  const allowance = await useAiAllowance(user, "career_plan", locale);
  const plan = await generateCareerPlan({
    profileText: user.resume_text || profileText(user),
    years: user.years_experience == null ? null : Number(user.years_experience),
    seniority: user.seniority,
    education: educationText(user),
    targetRole: body.target_role,
    horizon: body.horizon,
    locale,
  }).catch(async (e) => {
    await allowance.refund();
    console.error("career plan failed", e);
    throw new HttpError(502, say(req, "The career plan couldn't be written right now. Try again in a minute.", "Karriärplanen kunde inte skrivas just nu. Försök igen om en minut."));
  });
  if (plan.path.length === 0) {
    await allowance.refund();
    throw new HttpError(502, say(req, "The career plan came back incomplete. Try again.", "Karriärplanen blev ofullständig. Försök igen."));
  }
  const saved = await saveCareerPlan(user.id, plan, body.target_role, body.horizon, locale);
  return ok({
    plan: visiblePlan(plan, user),
    target_role: body.target_role, horizon: body.horizon, created_at: saved?.created_at ?? new Date(), stale: false,
    open_jobs: await openJobCounts(planRoles(plan)),
  });
});
