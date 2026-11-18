/**
 * Site-wide settings in one place. Change limits or contact details here (or
 * via environment variables) without hunting through pages.
 */
export const site = {
  name: "JobFitwise",
  /** Shown on the Privacy and Terms pages. Set CONTACT_EMAIL in your hosting environment. */
  contactEmail: process.env.CONTACT_EMAIL || null,
  /** Legal name of whoever runs the site (you, or your company). Set OPERATOR_NAME. */
  operatorName: process.env.OPERATOR_NAME || null,
  country: "Sweden",
};

/** Free-plan daily limits on actions that cost money (Claude API calls). */
export const AI_DAILY_LIMITS = {
  cover_letter: Number(process.env.LIMIT_COVER_LETTERS_PER_DAY ?? 10),
  resume_parse: Number(process.env.LIMIT_RESUME_UPLOADS_PER_DAY ?? 5),
  fit_explain: Number(process.env.LIMIT_FIT_EXPLANATIONS_PER_DAY ?? 30),
  gap_report: Number(process.env.LIMIT_GAP_REPORTS_PER_DAY ?? 20),
  interview_prep: Number(process.env.LIMIT_INTERVIEW_PREP_PER_DAY ?? 10),
  interview_turn: Number(process.env.LIMIT_INTERVIEW_ANSWERS_PER_DAY ?? 60),
  career_plan: Number(process.env.LIMIT_CAREER_PLANS_PER_DAY ?? 5),
} as const;

export type AiKind = keyof typeof AI_DAILY_LIMITS;
