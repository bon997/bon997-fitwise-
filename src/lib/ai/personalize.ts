/**
 * Personalization: the "For you" ranking.
 *
 * Design rule: the fit score stays an honest measure of "do you meet this
 * job's requirements". Personal taste is a separate, bounded boost on top
 * (±MAX_BOOST), and every adjustment carries a plain-language reason the
 * user can see. Nothing is a black box, and the user can always correct it
 * by editing preferences or undoing a dismissal.
 *
 * Signals, strongest first:
 *   explicit  – target roles, minimum salary (profile preferences)
 *   learned   – jobs the user applied to (3×), saved (2×), dismissed (with reason)
 */
import { normalizeSkill } from "./skills";
import type { JobSkill, Seniority } from "./fit-score";

export const MAX_BOOST = 15;

export type DismissReason = "not_my_role" | "wrong_location" | "salary_too_low" | "wrong_seniority" | "company" | "other";

export type SignalJob = {
  id?: string;
  title: string;
  company: string;
  location: string | null;
  seniority: Seniority | null;
  skills: JobSkill[];
};

export type UserSignals = {
  targetTitles: string[];
  salaryMin: number | null;
  liked: { job: SignalJob; weight: number }[]; // applied = 3, saved = 2
  dismissed: { job: SignalJob; reason: DismissReason }[];
};

export type PersonalJob = SignalJob & { salary_min: number | null; salary_max: number | null };

export type Reason = { text: string; positive: boolean };
export type Personalization = { boost: number; reasons: Reason[]; hidden: boolean };

/** Words that say nothing about the kind of role. */
const STOP = new Set([
  "senior", "sr", "junior", "jr", "lead", "principal", "staff", "head", "of", "and", "the", "a", "an", "i", "ii", "iii",
  "mid", "level", "intern", "internship", "remote", "hybrid", "for", "to", "in", "at", "with", "team", "&", "-", "/",
]);

/** Spellings and synonyms that mean the same role word. */
const TITLE_SYNONYMS: Record<string, string> = {
  developer: "engineer", dev: "engineer", programmer: "engineer", swe: "engineer",
  "front-end": "frontend", "back-end": "backend", "full-stack": "fullstack",
};

export function titleTokens(title: string): Set<string> {
  const t = title
    .toLowerCase()
    .replace(/\bfront[\s-]end\b/g, "frontend")
    .replace(/\bback[\s-]end\b/g, "backend")
    .replace(/\bfull[\s-]stack\b/g, "fullstack");
  return new Set(
    t
      .split(/[^a-z0-9+#.]+/)
      .map((t) => t.replace(/^\.+|\.+$/g, ""))
      .filter((t) => t.length > 1 && !STOP.has(t))
      .map((t) => TITLE_SYNONYMS[t] ?? t),
  );
}

const overlap = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 || b.size === 0) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / Math.min(a.size, b.size);
};

const skillSet = (j: SignalJob) => new Set(j.skills.map((s) => normalizeSkill(s.name)));
const cityOf = (loc: string | null) => (loc ?? "").toLowerCase().split(",")[0].trim();

/** Precompute per-user aggregates once, then score many jobs cheaply. */
export function buildProfile(s: UserSignals) {
  const targetTitleTokens = s.targetTitles.map(titleTokens);

  const likedSkills = new Map<string, number>();
  let likedWeight = 0;
  for (const { job, weight } of s.liked) {
    likedWeight += weight;
    for (const sk of skillSet(job)) likedSkills.set(sk, (likedSkills.get(sk) ?? 0) + weight);
  }
  const likedTitles = s.liked.map((l) => ({ id: l.job.id, tokens: titleTokens(l.job.title) }));

  const roleDismissTitles: Set<string>[] = [];
  const roleDismissSkills = new Map<string, number>();
  const hiddenCompanies = new Set<string>();
  const badCities = new Map<string, number>();
  const badSeniority = new Map<string, number>();

  for (const { job, reason } of s.dismissed) {
    if (reason === "not_my_role") {
      roleDismissTitles.push(titleTokens(job.title));
      for (const sk of skillSet(job)) roleDismissSkills.set(sk, (roleDismissSkills.get(sk) ?? 0) + 1);
    }
    if (reason === "company") hiddenCompanies.add(job.company.toLowerCase().trim());
    if (reason === "wrong_location" && job.location) badCities.set(cityOf(job.location), (badCities.get(cityOf(job.location)) ?? 0) + 1);
    if (reason === "wrong_seniority" && job.seniority) badSeniority.set(job.seniority, (badSeniority.get(job.seniority) ?? 0) + 1);
  }

  return { s, targetTitleTokens, likedSkills, likedWeight, likedTitles, roleDismissTitles, roleDismissSkills, hiddenCompanies, badCities, badSeniority };
}
export type PersonalProfile = ReturnType<typeof buildProfile>;

export function personalize(job: PersonalJob, p: PersonalProfile): Personalization {
  if (p.hiddenCompanies.has(job.company.toLowerCase().trim())) {
    return { boost: 0, reasons: [{ text: `You hid jobs from ${job.company}`, positive: false }], hidden: true };
  }

  const reasons: Reason[] = [];
  const up = (text: string) => reasons.push({ text, positive: true });
  const down = (text: string) => reasons.push({ text, positive: false });
  let boost = 0;
  const title = titleTokens(job.title);
  const skills = skillSet(job);

  // 1. Target roles (explicit) — up to +6. Needs ≥ 2/3 of the target's words,
  //    so "Data Engineer" doesn't match a "Frontend Engineer" target on "engineer" alone.
  const targetMatch = Math.max(0, ...p.targetTitleTokens.map((t) => overlap(title, t)));
  if (targetMatch >= 0.66) {
    boost += Math.round(6 * targetMatch);
    up("Matches a role you're targeting");
  }

  // 2. Similar to jobs you saved or applied to (learned) — up to +6
  // A job the user already saved/applied to isn't "similar to" itself.
  const others = p.likedTitles.filter((t) => !job.id || t.id !== job.id);
  if (p.likedWeight > 0 && others.length > 0) {
    const titleSim = Math.max(0, ...others.map((t) => overlap(title, t.tokens)));
    let skillAff = 0;
    for (const sk of skills) skillAff += p.likedSkills.get(sk) ?? 0;
    const skillSim = skills.size ? Math.min(1, skillAff / (p.likedWeight * Math.min(skills.size, 4))) : 0;
    const sim = 0.6 * titleSim + 0.4 * skillSim;
    if (sim >= 0.35) {
      boost += Math.round(6 * sim);
      up("Similar to jobs you saved or applied to");
    }
  }

  // 3. Salary (explicit) — +3 / −10
  if (p.s.salaryMin) {
    const top = job.salary_max ?? job.salary_min;
    if (top != null && top < p.s.salaryMin) {
      boost -= 10;
      down("Pays below your minimum salary");
    } else if (job.salary_min != null && job.salary_min >= p.s.salaryMin) {
      boost += 3;
      up("Meets your salary minimum");
    }
  }

  // 4. Roles you said aren't yours (learned) — up to −8
  const roleSim = Math.max(0, ...p.roleDismissTitles.map((t) => overlap(title, t)));
  if (roleSim >= 0.6) {
    boost -= Math.round(8 * roleSim);
    down("Similar to roles you marked as not for you");
  }

  // 5. Locations / seniority you dismissed twice or more (learned) — −6 each
  if (job.location && (p.badCities.get(cityOf(job.location)) ?? 0) >= 2) {
    boost -= 6;
    down(`You've passed on jobs in ${job.location.split(",")[0]}`);
  }
  if (job.seniority && (p.badSeniority.get(job.seniority) ?? 0) >= 2) {
    boost -= 6;
    down(`You've passed on ${job.seniority}-level roles`);
  }

  return { boost: Math.max(-MAX_BOOST, Math.min(MAX_BOOST, boost)), reasons, hidden: false };
}

/** Rank score for "For you". Fit dominates; personalization breaks ties and nudges. */
export const forYouScore = (fit: number, boost: number) => Math.max(0, Math.min(100, fit + boost));
