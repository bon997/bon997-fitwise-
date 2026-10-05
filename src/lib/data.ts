/** Row types (as returned by pg) and the public JSON shapes the API exposes. */
import type { JobSkill, Seniority } from "./ai/fit-score";

export type ExperienceItem = {
  title: string;
  company: string;
  start: string | null;
  end: string | null;
  summary: string;
  skills: string[];
};

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  role: "user" | "admin";
  resume_url: string | null;
  resume_text: string | null;
  skills: string[];
  experience: ExperienceItem[];
  years_experience: string | null; // pg returns numeric as string
  seniority: Seniority | null;
  preferences: { locations?: string[]; remote_only?: boolean; target_titles?: string[]; salary_min?: number | null; suggested_roles?: string[] };
  resume_score: number | null;
  profile_updated_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  employment_type: string | null;
  description: string;
  requirements: string;
  responsibilities: string[];
  skills: JobSkill[];
  seniority: Seniority | null;
  min_years: string | null;
  salary_range: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  apply_url: string | null;
  source: string;
  external_id: string;
  posted_at: Date | null;
  is_active: boolean;
  embedded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type FitScoreRow = {
  user_id: string;
  job_id: string;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  breakdown: Record<string, number | null>;
  explanation: string | null;
  computed_at: Date;
};

export const num = (v: string | number | null): number | null => (v == null ? null : Number(v));

/** Columns safe to return in list views (no long text). */
export const JOB_LIST_COLUMNS = `j.id, j.title, j.company, j.location, j.remote, j.employment_type, j.seniority,
  j.salary_range, j.salary_min, j.salary_max, j.salary_currency, j.posted_at, j.skills, j.apply_url, j.source`;

export function publicUser(u: UserRow) {
  const { password_hash: _p, google_id: _g, resume_text: _t, ...rest } = u;
  return { ...rest, years_experience: num(u.years_experience) };
}

export function publicFit(f: FitScoreRow | null | undefined) {
  if (!f) return null;
  return {
    score: f.score,
    matched_skills: f.matched_skills,
    missing_skills: f.missing_skills,
    breakdown: f.breakdown,
    explanation: f.explanation,
    computed_at: f.computed_at,
  };
}

export const APPLICATION_STATUSES = ["draft", "applied", "interviewing", "offer", "rejected", "withdrawn"] as const;
