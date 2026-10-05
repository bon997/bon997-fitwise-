/**
 * Fit score: a deterministic, explainable 0–100 score for one user × one job.
 *
 * Claude is used upstream (extracting skills from resumes and job posts) and
 * downstream (writing a human explanation), but the number itself is computed
 * here so it is fast, cheap, reproducible and testable.
 *
 *   score = Σ wᵢ·cᵢ / Σ wᵢ      over components cᵢ that have data
 *
 * A component with no data (e.g. a job with no stated years) drops out and the
 * remaining weights are renormalized, so missing data neither helps nor hurts.
 */
import { normalizeSkill, skillCredit } from "./skills";

export const SENIORITY = ["intern", "junior", "mid", "senior", "lead", "executive"] as const;
export type Seniority = (typeof SENIORITY)[number];

export type JobSkill = { name: string; required: boolean };

export type FitProfile = {
  skills: string[];
  yearsExperience: number | null;
  seniority: Seniority | null;
  preferences: { locations?: string[]; remote_only?: boolean };
};

export type FitJob = {
  skills: JobSkill[];
  minYears: number | null;
  seniority: Seniority | null;
  location: string | null;
  remote: boolean;
};

export type FitBreakdown = {
  skills: number | null;
  experience: number | null;
  seniority: number | null;
  semantic: number | null;
  location: number | null;
};

export type FitResult = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  partialSkills: string[];
  breakdown: FitBreakdown;
};

export const WEIGHTS: Record<keyof FitBreakdown, number> = {
  skills: 0.45,
  semantic: 0.2,
  experience: 0.15,
  seniority: 0.1,
  location: 0.1,
};

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
  let missingRequired = 0;
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
      if (js.required) missingRequired++;
    }
  }

  return {
    score: possible === 0 ? null : clamp((earned / possible) * 100),
    matched,
    partial,
    missing,
    missingRequired,
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

/**
 * @param semantic  calibrated similarity 0–1 between resume and job text
 *                  (from embeddings), or null if unavailable.
 */
export function computeFitScore(profile: FitProfile, job: FitJob, semantic: number | null = null): FitResult {
  const skills = scoreSkills(profile.skills, job.skills);

  const breakdown: FitBreakdown = {
    skills: skills.score,
    experience: scoreExperience(profile.yearsExperience, job.minYears),
    seniority: scoreSeniority(profile.seniority, job.seniority),
    semantic: semantic == null ? null : clamp(semantic * 100),
    location: scoreLocation(profile.preferences, job),
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
  if (skills.missingRequired > 0) {
    score = Math.min(score, 100 - CAP_PER_MISSING_REQUIRED * skills.missingRequired);
  }

  return {
    score: Math.round(clamp(score)),
    matchedSkills: skills.matched,
    partialSkills: skills.partial,
    missingSkills: skills.missing,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, v == null ? null : Math.round(v)]),
    ) as FitBreakdown,
  };
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
