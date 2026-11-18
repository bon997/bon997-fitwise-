/**
 * Subscription plans and what each one unlocks.
 *
 *   Basic (free)  – search, save (up to 10), apply, upload a CV, see each job's match number
 *   Pro           – full match breakdown (ATS-style), skill gaps, "For you" recommendations,
 *                   priorities + advanced filters, email job alerts, AI fit explanations,
 *                   resume tips, unlimited saved jobs
 *   Premium       – everything in Pro + AI cover letters (and the coming tailored CV,
 *                   interview prep and LinkedIn tools)
 *
 * The paywall is OFF unless PAYWALL_ENABLED=true: while it's off (beta) everyone
 * gets Premium, so nothing changes for users until you decide to launch plans.
 * Admins always get Premium. Pure functions; the plan itself lives on the user row.
 */

export const PLANS = ["basic", "pro", "premium"] as const;
export type Plan = (typeof PLANS)[number];

export const FEATURES = {
  /** The full 40/30/20/10 breakdown, confidence, readiness and "biggest win". */
  match_breakdown: "pro",
  /** "Skills worth learning" and missing-skill lists. */
  skill_gaps: "pro",
  /** "For you" ranking and the dashboard's personalised matches. */
  recommendations: "pro",
  /** "My priorities" sort and the minimum-match filter. */
  advanced_filters: "pro",
  /** Email job alerts on a schedule. */
  job_alerts: "pro",
  /** The AI-written explanation of a fit score. */
  fit_explanation: "pro",
  /** Resume improvement tips after an upload. */
  resume_tips: "pro",
  /** More than BASIC_SAVED_LIMIT saved jobs. */
  unlimited_saves: "pro",
  /** AI cover letters ("Cover letter with AI"). */
  cover_letters: "premium",
  /** Coming: tailored CV, interview prep, LinkedIn optimisation. */
  career_tools: "premium",
} as const satisfies Record<string, Plan>;
export type Feature = keyof typeof FEATURES;

export const BASIC_SAVED_LIMIT = 10;

const RANK: Record<Plan, number> = { basic: 0, pro: 1, premium: 2 };

export const paywallEnabled = () => process.env.PAYWALL_ENABLED?.trim().toLowerCase() === "true";

type PlanUser = { plan?: string | null; plan_status?: string | null; plan_period_end?: Date | string | null; role?: string | null };

/**
 * The plan a person actually has right now. A subscription that is active,
 * trialing or briefly past due keeps its plan; cancelled ones keep it until the
 * paid period ends; anything else is Basic.
 */
export function currentPlan(u: PlanUser | null | undefined, now = new Date()): Plan {
  if (!u) return "basic";
  if (u.role === "admin" || !paywallEnabled()) return "premium";
  const plan = (PLANS as readonly string[]).includes(u.plan ?? "") ? (u.plan as Plan) : "basic";
  if (plan === "basic") return "basic";
  const end = u.plan_period_end ? new Date(u.plan_period_end) : null;
  if (u.plan_status === "active" || u.plan_status === "trialing" || u.plan_status === "past_due") return plan;
  if (u.plan_status === "manual") return plan; // granted by an admin, no Stripe
  if (end && end > now) return plan; // cancelled, but paid until the end of the period
  return "basic";
}

export const planIncludes = (plan: Plan, feature: Feature) => RANK[plan] >= RANK[FEATURES[feature]];
export const can = (u: PlanUser | null | undefined, feature: Feature, now = new Date()) => planIncludes(currentPlan(u, now), feature);
/** The cheapest plan that unlocks a feature (for "Upgrade to PRO" vs "PREMIUM"). */
export const planFor = (feature: Feature): Plan => FEATURES[feature];

/** Display prices (incl. 25 % VAT). The charged amount is the Stripe price; keep these in step. */
export const PRICE_SEK: Record<Exclude<Plan, "basic">, number> = {
  pro: Number(process.env.NEXT_PUBLIC_PRICE_PRO_SEK ?? 79),
  premium: Number(process.env.NEXT_PUBLIC_PRICE_PREMIUM_SEK ?? 149),
};

/** Stripe price ids per plan, from the environment. */
export const stripePriceId = (plan: Exclude<Plan, "basic">) =>
  (plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_PREMIUM)?.trim() || null;

/** Which plan a Stripe price id stands for (webhooks only carry the price). */
export function planForPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO?.trim()) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM?.trim()) return "premium";
  return null;
}

/** Thrown by routes when a plan doesn't include a feature; the UI shows the upgrade popup on 402. */
export class PlanRequiredError extends Error {
  status = 402;
  constructor(public feature: Feature, public plan: Plan) {
    super(plan === "premium" ? "Upgrade to Premium to use this" : "Upgrade to Pro to use this");
  }
}
export function requireFeature(u: PlanUser, feature: Feature) {
  if (!can(u, feature)) throw new PlanRequiredError(feature, planFor(feature));
}
