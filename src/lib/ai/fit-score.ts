/**
 * Fit score: a deterministic, explainable 0–100 score for one user × one job.
 *
 * Claude is used upstream (extracting skills from resumes and job posts) and
 * downstream (writing a human explanation), but the number itself is computed
 * here so it is fast, cheap, reproducible and testable.
 *
 *   score = (40·Skills + 30·Experience + 20·Education + 10·Location&type) / Σ weights with data
 *
 * Each part is 0–100. A part with no data (e.g. an ad that states no education)
 * drops out and the remaining weights are renormalized, so missing data neither
 * helps nor hurts. Inside a part, sub-signals blend the same way:
 *   Skills     = 75 % skill overlap + 25 % meaning-match (embeddings)
 *   Experience = 70 % years vs. years asked + 30 % seniority level, counted in full
 *                only when at least half the skills fit (years in an unrelated
 *                field are worth less; never below 30 %)
 *   Location   = 70 % place + 30 % employment type
 */
import { normalizeSkill, skillCredit } from "./skills";

export const SENIORITY = ["intern", "junior", "mid", "senior", "lead", "executive"] as const;
export type Seniority = (typeof SENIORITY)[number];

/** `src: "tags"` = taken from the employer's own Platsbanken tags because the AI couldn't read the ad yet. */
export type JobSkill = { name: string; required: boolean; src?: "tags" };

/** Education levels in Swedish terms, lowest first. "vocational" = yrkeshögskola / YH. */
export const EDUCATION = ["gymnasium", "vocational", "bachelor", "master", "phd"] as const;
export type EducationLevel = (typeof EDUCATION)[number];
export type Education = { level: EducationLevel; field: string | null };
/** What an ad asks for. `level: null` = extracted, none stated. */
export type JobEducation = { level: EducationLevel | null; field: string | null; equivalent_ok: boolean };

export type FitProfile = {
  skills: string[];
  yearsExperience: number | null;
  seniority: Seniority | null;
  education?: Education[];
  preferences: { locations?: string[]; remote_only?: boolean; job_types?: string[] };
};

export type FitJob = {
  skills: JobSkill[];
  minYears: number | null;
  seniority: Seniority | null;
  location: string | null;
  remote: boolean;
  education?: JobEducation | null;
  employmentType?: string | null;
};

/** The four parts the user sees, each 0–100 (null = no data, left out). */
export type FitBreakdown = {
  skills: number | null;
  experience: number | null;
  education: number | null;
  location: number | null;
};

/** The raw signals behind the parts, kept for the explanation and for debugging. */
export type FitDetails = {
  skill_match: number | null;
  semantic: number | null;
  years: number | null;
  seniority: number | null;
  place: number | null;
  work_type: number | null;
};

export type Confidence = "high" | "medium" | "low";
export type Readiness = "ready" | "almost" | "stretch";

export type FitResult = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  partialSkills: string[];
  /** Must-have skills the user lacks (a subset of missingSkills). */
  missingRequired: string[];
  breakdown: FitBreakdown;
  details: FitDetails;
  confidence: Confidence;
  readiness: Readiness;
};

/** Points out of 100 per part (the brief's 40/30/20/10). */
export const WEIGHTS: Record<keyof FitBreakdown, number> = {
  skills: 40,
  experience: 30,
  education: 20,
  location: 10,
};

export const READY_SCORE = 80;
export const ALMOST_SCORE = 65;

const REQUIRED_WEIGHT = 2;
const OPTIONAL_WEIGHT = 1;

/** Missing a required skill caps the total: you can't be a 95% fit without the must-haves. */
const CAP_PER_MISSING_REQUIRED = 12;

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export function scoreSkills(userSkills: string[], jobSkills: JobSkill[]) {
  const have = new Set(userSkills.map(normalizeSkill));
  const matched: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];
  const missingRequiredNames: string[] = [];
  let earned = 0;
  let possible = 0;

  const seen = new Set<string>();
  for (const js of jobSkills) {
    const name = normalizeSkill(js.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const w = js.required ? REQUIRED_WEIGHT : OPTIONAL_WEIGHT;
    const credit = skillCredit(name, have);
    possible += w;
    earned += w * credit;

    if (credit === 1) matched.push(name);
    else if (credit > 0) partial.push(name);
    else {
      missing.push(name);
      if (js.required) missingRequiredNames.push(name);
    }
  }

  return {
    score: possible === 0 ? null : clamp((earned / possible) * 100),
    matched,
    partial,
    missing,
    missingRequired: missingRequiredNames.length,
    missingRequiredNames,
    jobSkillCount: seen.size,
  };
}

export function scoreExperience(userYears: number | null, minYears: number | null): number | null {
  if (minYears == null || minYears <= 0) return null;
  if (userYears == null) return 50; // unknown: neutral, not zero
  if (userYears >= minYears) {
    // Heavily overqualified candidates are often screened out; soften, don't zero.
    return userYears - minYears > 8 ? 80 : 100;
  }
  // Linear shortfall; being 1 year short of 5 still scores 80.
  return clamp((userYears / minYears) * 100);
}

export function scoreSeniority(user: Seniority | null, job: Seniority | null): number | null {
  if (!user || !job) return null;
  const diff = Math.abs(SENIORITY.indexOf(user) - SENIORITY.indexOf(job));
  return [100, 70, 35][diff] ?? 0;
}

export function scoreLocation(prefs: FitProfile["preferences"], job: Pick<FitJob, "location" | "remote">): number | null {
  if (job.remote) return 100;
  if (prefs.remote_only) return 0;
  const wanted = (prefs.locations ?? []).map((l) => l.toLowerCase().trim()).filter(Boolean);
  if (wanted.length === 0 || !job.location) return null;
  const loc = job.location.toLowerCase();
  return wanted.some((w) => loc.includes(w)) ? 100 : 25;
}

const EDU_RANK = (l: EducationLevel) => EDUCATION.indexOf(l);

/**
 * Education: level met = 100; one level short = 60 (70 when the ad accepts
 * equivalent experience); further short = 30. Unknown education on a profile is
 * neutral (50), never zero. The field of study is stored but not scored yet:
 * comparing field names word by word punished related degrees ("software
 * engineering" vs "computer science") and translated foreign ones.
 */
export function scoreEducation(user: Education[] | undefined, job: JobEducation | null | undefined): number | null {
  if (!job?.level) return null;
  if (!user || user.length === 0) return 50;
  const best = Math.max(...user.map((e) => EDU_RANK(e.level)));
  const need = EDU_RANK(job.level);
  let s = best >= need ? 100 : best === need - 1 ? 60 : 30;
  if (s < 100 && job.equivalent_ok) s = Math.max(s, 70);
  return s;
}

/** Employment type vs. the types the user wants; null when either side is unknown. */
export function scoreWorkType(wanted: string[] | undefined, jobType: string | null | undefined): number | null {
  if (!jobType || !wanted || wanted.length === 0) return null;
  return wanted.includes(jobType) ? 100 : 30;
}

/** Blend sub-signals with weights, skipping missing ones; null when none have data. */
function blend(parts: [number | null, number][]): number | null {
  let num = 0, den = 0;
  for (const [v, w] of parts) if (v != null) { num += v * w; den += w; }
  return den === 0 ? null : num / den;
}

/**
 * Confidence = how much real data the score rests on. Counts parts where the
 * ad states something AND the profile has the matching fact, plus how many
 * skills the ad lists — a 100 on a 4-skill ad is a weaker signal than a 100 on 12.
 */
export function scoreConfidence(knownParts: number, jobSkills: number): Confidence {
  if (knownParts >= 3 && jobSkills >= 5) return "high";
  if (knownParts >= 2 && jobSkills >= 3) return "medium";
  return "low";
}

export function scoreReadiness(score: number, missingRequired: number): Readiness {
  if (score >= READY_SCORE && missingRequired === 0) return "ready";
  if (score >= ALMOST_SCORE && missingRequired <= 1) return "almost";
  return "stretch";
}

/**
 * @param semantic  calibrated similarity 0–1 between resume and job text
 *                  (from embeddings), or null if unavailable.
 */
/** Highest score a job can get when neither skills nor text similarity are available. */
export const NO_SKILLS_CAP = 50;

export function computeFitScore(profile: FitProfile, job: FitJob, semantic: number | null = null): FitResult {
  const skills = scoreSkills(profile.skills, job.skills);
  const semanticPct = semantic == null ? null : clamp(semantic * 100);
  const years = scoreExperience(profile.yearsExperience, job.minYears);
  const level = scoreSeniority(profile.seniority, job.seniority);
  const place = scoreLocation(profile.preferences, job);
  const workType = scoreWorkType(profile.preferences.job_types, job.employmentType);

  const skillPart = blend([[skills.score, 0.75], [semanticPct, 0.25]]);
  const experienceRaw = blend([[years, 0.7], [level, 0.3]]);
  const relevance = skillPart == null ? 1 : Math.min(1, Math.max(0.3, skillPart / 50));
  const breakdown: FitBreakdown = {
    skills: skillPart,
    experience: experienceRaw == null ? null : experienceRaw * relevance,
    education: scoreEducation(profile.education, job.education),
    location: blend([[place, 0.7], [workType, 0.3]]),
  };

  let num = 0;
  let den = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof FitBreakdown)[]) {
    const v = breakdown[key];
    if (v == null) continue;
    num += WEIGHTS[key] * v;
    den += WEIGHTS[key];
  }

  let score = den === 0 ? 0 : num / den;
  // Without the job's skills there's too little to judge; location and level alone
  // must never make a job look like a perfect fit.
  if (skills.score == null && semanticPct == null) {
    score = Math.min(score, NO_SKILLS_CAP);
  }
  if (skills.missingRequired > 0) {
    score = Math.min(score, 100 - CAP_PER_MISSING_REQUIRED * skills.missingRequired);
  }
  score = Math.round(clamp(score));

  // Parts backed by facts on both sides (a neutral 50 for an unknown profile fact doesn't count).
  const known = [
    skills.score != null || semanticPct != null,
    job.minYears != null && job.minYears > 0 && profile.yearsExperience != null,
    Boolean(job.education?.level) && (profile.education?.length ?? 0) > 0,
    place != null,
  ].filter(Boolean).length;

  const round = (v: number | null) => (v == null ? null : Math.round(v));
  return {
    score,
    matchedSkills: skills.matched,
    partialSkills: skills.partial,
    missingSkills: skills.missing,
    missingRequired: skills.missingRequiredNames,
    breakdown: {
      skills: round(breakdown.skills),
      experience: round(breakdown.experience),
      education: round(breakdown.education),
      location: round(breakdown.location),
    },
    details: {
      skill_match: round(skills.score), semantic: round(semanticPct), years: round(years),
      seniority: round(level), place: round(place), work_type: round(workType),
    },
    confidence: scoreConfidence(known, skills.jobSkillCount),
    readiness: scoreReadiness(score, skills.missingRequired),
  };
}

/** Points a part contributes out of its weight, e.g. skills 83 → 33/40. */
export function partPoints(part: keyof FitBreakdown, value: number | null): number | null {
  return value == null ? null : Math.round((value / 100) * WEIGHTS[part]);
}

/**
 * The single missing skill that would raise this job's score the most —
 * computed by re-scoring with the skill added, not guessed.
 */
export function bestImprovement(profile: FitProfile, job: FitJob, semantic: number | null = null): { skill: string; from: number; to: number } | null {
  const base = computeFitScore(profile, job, semantic);
  let best: { skill: string; from: number; to: number } | null = null;
  for (const skill of base.missingSkills) {
    const to = computeFitScore({ ...profile, skills: [...profile.skills, skill] }, job, semantic).score;
    if (to > base.score && (!best || to > best.to)) best = { skill, from: base.score, to };
  }
  return best;
}

/**
 * Resume completeness score for the dashboard (0–100). Rewards the things
 * that make matching accurate: enough skills, dated roles with descriptions.
 */
export function computeResumeScore(p: {
  skills: string[];
  experience: { title?: string; start?: string | null; summary?: string | null }[];
  yearsExperience: number | null;
}): number {
  let s = 0;
  s += Math.min(p.skills.length, 15) * 2.5; // up to 37.5
  const roles = p.experience.slice(0, 5);
  s += Math.min(roles.length, 3) * 8; // up to 24
  const described = roles.filter((r) => (r.summary ?? "").trim().length >= 60).length;
  s += Math.min(described, 3) * 8; // up to 24
  const dated = roles.filter((r) => r.start).length;
  if (roles.length > 0 && dated === roles.length) s += 8;
  if (p.yearsExperience != null) s += 6.5;
  return Math.round(clamp(s));
}
