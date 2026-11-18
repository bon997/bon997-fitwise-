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
  /** The AI CV gap report on a job page (Basic gets FREE_PREVIEWS of it). */
  gap_report: "pro",
  /** AI cover letters ("Cover letter with AI"). */
  cover_letters: "premium",
  /** Interview coach: questions with CV-based answers, STAR examples, mock interviews. */
  interview_coach: "premium",
  /** Career coach: role path, skill plan, certifications, salary steps, alternative routes. */
  career_coach: "premium",
  /** Coming: tailored CV, LinkedIn optimisation. */
  career_tools: "premium",
} as const satisfies Record<string, Plan>;
export type Feature = keyof typeof FEATURES;

export const BASIC_SAVED_LIMIT = 10;

/** How many times someone without the plan may try a paid AI tool, so they see what it does. */
export const FREE_PREVIEWS = { gap_report: 1, interview_coach: 1, career_coach: 1 } as const;
/** Without Premium, an interview pack shows only this many questions. */
export const INTERVIEW_PREVIEW_QUESTIONS = 3;

const RANK: Record<Plan, number> = { basic: 0, pro: 1, premium: 2 };

export const paywallEnabled = () => process.env.PAYWALL_ENABLED?.trim().toLowerCase() === "true";

type PlanUser = {
  plan?: string | null; plan_status?: string | null; plan_period_end?: Date | string | null; role?: string | null;
  trial_ends_at?: Date | string | null;
};

/**
 * The plan a person actually has right now. A subscription that is active,
 * trialing or briefly past due keeps its plan; cancelled ones keep it until the
 * paid period ends; anything else is Basic.
 */
export function currentPlan(u: PlanUser | null | undefined, now = new Date()): Plan {
  if (!u) return "basic";
  if (u.role === "admin" || !paywallEnabled()) return "premium";
  const paid = paidPlan(u, now);
  // A free Pro trial lifts Basic to Pro until it ends; it never lowers a paid plan.
  if (paid === "basic" && u.trial_ends_at && new Date(u.trial_ends_at) > now) return "pro";
  return paid;
}

/** The plan someone pays for (or was granted), ignoring trials. */
function paidPlan(u: PlanUser, now: Date): Plan {
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

// ── Free trial ──────────────────────────────────────────────────────────
/** Days of free Pro after the first CV upload (0 turns trials off). No card is asked for. */
export const TRIAL_DAYS = Math.max(0, Number(process.env.TRIAL_DAYS ?? 7));

/** Whole days left of a running trial on an otherwise-Basic account, else null. */
export function trialDaysLeft(u: PlanUser | null | undefined, now = new Date()): number | null {
  if (!u?.trial_ends_at || !paywallEnabled() || u.role === "admin") return null;
  const end = new Date(u.trial_ends_at);
  if (end <= now || paidPlan(u, now) !== "basic") return null;
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 864e5));
}

/** True for a short while after a trial ran out without an upgrade (to show "your trial ended"). */
export function trialJustEnded(u: PlanUser | null | undefined, now = new Date()): boolean {
  if (!u?.trial_ends_at || !paywallEnabled() || u.role === "admin") return false;
  const end = new Date(u.trial_ends_at);
  return end <= now && now.getTime() - end.getTime() < 14 * 864e5 && paidPlan(u, now) === "basic";
}

// ── Prices ──────────────────────────────────────────────────────────────
export type PaidPlan = Exclude<Plan, "basic">;
export const PERIODS = ["month", "quarter", "year"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_MONTHS: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

/** Display prices per billing period (incl. 25 % VAT). The charged amount is the Stripe price; keep these in step. */
export const PRICES_SEK: Record<PaidPlan, Record<Period, number>> = {
  pro: {
    month: Number(process.env.NEXT_PUBLIC_PRICE_PRO_SEK ?? 79),
    quarter: Number(process.env.NEXT_PUBLIC_PRICE_PRO_QUARTER_SEK ?? 199),
    year: Number(process.env.NEXT_PUBLIC_PRICE_PRO_YEAR_SEK ?? 590),
  },
  premium: {
    month: Number(process.env.NEXT_PUBLIC_PRICE_PREMIUM_SEK ?? 149),
    quarter: Number(process.env.NEXT_PUBLIC_PRICE_PREMIUM_QUARTER_SEK ?? 379),
    year: Number(process.env.NEXT_PUBLIC_PRICE_PREMIUM_YEAR_SEK ?? 1190),
  },
};
/** Monthly prices (kept for the upgrade buttons). */
export const PRICE_SEK: Record<PaidPlan, number> = { pro: PRICES_SEK.pro.month, premium: PRICES_SEK.premium.month };

/** Price per month and saving vs paying monthly, for a period. */
export function periodDeal(plan: PaidPlan, period: Period) {
  const total = PRICES_SEK[plan][period];
  const months = PERIOD_MONTHS[period];
  const perMonth = Math.round(total / months);
  const save = Math.max(0, Math.round((1 - total / (PRICES_SEK[plan].month * months)) * 100));
  return { total, perMonth, save, months };
}

const PRICE_ENV: Record<PaidPlan, Record<Period, string>> = {
  pro: { month: "STRIPE_PRICE_PRO", quarter: "STRIPE_PRICE_PRO_QUARTER", year: "STRIPE_PRICE_PRO_YEAR" },
  premium: { month: "STRIPE_PRICE_PREMIUM", quarter: "STRIPE_PRICE_PREMIUM_QUARTER", year: "STRIPE_PRICE_PREMIUM_YEAR" },
};

/** Stripe price id for a plan and billing period, from the environment. */
export const stripePriceId = (plan: PaidPlan, period: Period = "month") => process.env[PRICE_ENV[plan][period]]?.trim() || null;

/** Billing periods to offer: monthly always; 3 and 12 months once their Stripe prices exist (all of them before Stripe is set up). */
export function offeredPeriods(): Period[] {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return [...PERIODS];
  return PERIODS.filter((p) => p === "month" || (stripePriceId("pro", p) && stripePriceId("premium", p)));
}

/** Which plan a Stripe price id stands for (webhooks only carry the price). */
export function planForPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  for (const plan of ["pro", "premium"] as const) {
    for (const period of PERIODS) if (priceId === stripePriceId(plan, period)) return plan;
  }
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
