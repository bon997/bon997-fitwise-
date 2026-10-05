/**
 * Matching orchestration: turns DB rows into fit scores, caches them in
 * fit_scores, and produces ranked recommendations.
 *
 * Cache rule: a stored score is fresh if it was computed after both the
 * user's profile and the job last changed. Otherwise it is recomputed.
 */
import { sql, one } from "./db";
import { computeFitScore, type FitProfile, type FitJob, type FitResult } from "./ai/fit-score";
import { renderProfileText } from "./ai/parse-resume";
import { explainFit } from "./ai/cover-letter";
import { querySimilarJobs, semanticScores, semanticEnabled } from "./search/pinecone";
import { buildProfile, personalize, forYouScore, type PersonalProfile, type SignalJob, type DismissReason } from "./ai/personalize";
import { JOB_LIST_COLUMNS, num, type FitScoreRow, type JobRow, type UserRow } from "./data";

export function toFitProfile(u: UserRow): FitProfile {
  return {
    skills: u.skills,
    yearsExperience: num(u.years_experience),
    seniority: u.seniority,
    preferences: u.preferences ?? {},
  };
}

export function toFitJob(j: Pick<JobRow, "skills" | "min_years" | "seniority" | "location" | "remote">): FitJob {
  return { skills: j.skills, minYears: num(j.min_years), seniority: j.seniority, location: j.location, remote: j.remote };
}

export function profileText(u: UserRow): string {
  const titles = u.preferences?.target_titles?.length ? `Target roles: ${u.preferences.target_titles.join(", ")}\n` : "";
  return titles + renderProfileText({ skills: u.skills, experience: u.experience });
}

export const hasProfile = (u: UserRow) => u.skills.length > 0;

/** Score many jobs for one user and persist. Returns job id → result. */
export async function scoreAndStore(
  user: UserRow,
  jobs: Pick<JobRow, "id" | "skills" | "min_years" | "seniority" | "location" | "remote">[],
  knownSemantic = new Map<string, number>(),
): Promise<Map<string, FitResult>> {
  const out = new Map<string, FitResult>();
  if (jobs.length === 0 || !hasProfile(user)) return out;

  const needSemantic = jobs.map((j) => j.id).filter((id) => !knownSemantic.has(id));
  const fetched = await semanticScores(profileText(user), needSemantic);
  const semantic = new Map([...knownSemantic, ...fetched]);

  const profile = toFitProfile(user);
  for (const j of jobs) out.set(j.id, computeFitScore(profile, toFitJob(j), semantic.get(j.id) ?? null));

  // One round-trip upsert. Explanation is cleared because the numbers changed.
  const ids = [...out.keys()];
  const results = ids.map((id) => out.get(id)!);
  await sql(
    `INSERT INTO fit_scores (user_id, job_id, score, matched_skills, missing_skills, breakdown, explanation, computed_at)
     SELECT $1, t.job_id, t.score, t.matched, t.missing, t.breakdown, NULL, now()
     FROM unnest($2::uuid[], $3::smallint[], $4::jsonb[], $5::jsonb[], $6::jsonb[])
       AS t(job_id, score, matched, missing, breakdown)
     ON CONFLICT (user_id, job_id) DO UPDATE SET
       score = EXCLUDED.score, matched_skills = EXCLUDED.matched_skills,
       missing_skills = EXCLUDED.missing_skills, breakdown = EXCLUDED.breakdown,
       explanation = NULL, computed_at = now()`,
    [
      user.id,
      ids,
      results.map((r) => r.score),
      results.map((r) => JSON.stringify(r.matchedSkills)),
      results.map((r) => JSON.stringify(r.missingSkills)),
      results.map((r) => JSON.stringify({ ...r.breakdown, partial_skills: r.partialSkills })),
    ],
  );
  return out;
}

/** Fresh cached scores for these jobs; computes and stores any that are missing or stale. */
export async function fitScoresFor(user: UserRow, jobIds: string[]): Promise<Map<string, FitScoreRow>> {
  if (jobIds.length === 0 || !hasProfile(user)) return new Map();

  const rows = await sql<FitScoreRow & { fresh: boolean }>(
    `SELECT f.*, (f.computed_at >= coalesce($3::timestamptz, '-infinity') AND f.computed_at >= j.updated_at) AS fresh
     FROM fit_scores f JOIN jobs j ON j.id = f.job_id
     WHERE f.user_id = $1 AND f.job_id = ANY($2::uuid[])`,
    [user.id, jobIds, user.profile_updated_at],
  );
  const cached = new Map(rows.filter((r) => r.fresh).map((r) => [r.job_id, r as FitScoreRow]));

  const stale = jobIds.filter((id) => !cached.has(id));
  if (stale.length) {
    const jobs = await sql<JobRow>(
      "SELECT id, skills, min_years, seniority, location, remote FROM jobs WHERE id = ANY($1::uuid[])",
      [stale],
    );
    await scoreAndStore(user, jobs);
    const fresh = await sql<FitScoreRow>("SELECT * FROM fit_scores WHERE user_id = $1 AND job_id = ANY($2::uuid[])", [
      user.id,
      stale,
    ]);
    for (const r of fresh) cached.set(r.job_id, r);
  }
  return cached;
}

/** Single job, optionally with a Claude-written explanation (cached alongside the score). */
export async function fitForJob(user: UserRow, job: JobRow, opts: { explain?: boolean } = {}): Promise<FitScoreRow | null> {
  const row = (await fitScoresFor(user, [job.id])).get(job.id) ?? null;
  if (!row || !opts.explain || row.explanation) return row;

  const { partial_skills, ...breakdown } = row.breakdown as Record<string, unknown>;
  const explanation = await explainFit({
    jobTitle: job.title,
    company: job.company,
    fit: {
      score: row.score,
      matchedSkills: row.matched_skills,
      missingSkills: row.missing_skills,
      partialSkills: (partial_skills as string[]) ?? [],
      breakdown: breakdown as unknown as FitResult["breakdown"],
    },
  });
  await sql("UPDATE fit_scores SET explanation = $3 WHERE user_id = $1 AND job_id = $2", [user.id, job.id, explanation]);
  return { ...row, explanation };
}

/**
 * Weekly matches: candidates come from semantic nearest-neighbours (Pinecone)
 * plus any recent job sharing at least one skill (SQL). All are scored with the
 * same formula, then ranked.
 */
export async function recommendJobs(user: UserRow, opts: { limit?: number; days?: number; minScore?: number } = {}) {
  const limit = Math.min(opts.limit ?? 20, 50);
  const days = opts.days ?? 14;
  if (!hasProfile(user)) return [];

  const since = new Date(Date.now() - days * 86_400_000);
  const remoteOnly = Boolean(user.preferences?.remote_only);

  const semantic = semanticEnabled()
    ? await querySimilarJobs(profileText(user), { topK: 150, postedAfter: since, remoteOnly })
    : new Map<string, number>();

  const candidates = await sql<JobRow>(
    `SELECT id, skills, min_years, seniority, location, remote FROM jobs j
     WHERE j.is_active AND coalesce(j.posted_at, j.created_at) >= $2
       AND ($4::boolean IS FALSE OR j.remote)
       AND (j.id = ANY($3::uuid[]) OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(j.skills) s WHERE s->>'name' = ANY($1::text[])))
     ORDER BY coalesce(j.posted_at, j.created_at) DESC
     LIMIT 400`,
    [user.skills, since, [...semantic.keys()], remoteOnly],
  );

  const scored = await scoreAndStore(user, candidates, semantic);
  const ids = [...scored.keys()].filter((id) => scored.get(id)!.score >= (opts.minScore ?? 0));
  if (ids.length === 0) return [];

  const [jobs, personal] = await Promise.all([
    sql<JobRow>(`SELECT ${JOB_LIST_COLUMNS} FROM jobs j WHERE j.id = ANY($1::uuid[])`, [ids]),
    personalProfile(user),
  ]);

  return jobs
    .filter((j) => !personal.dismissedIds.has(j.id))
    .map((job) => {
      const r = scored.get(job.id)!;
      const p = personalize(job, personal.profile);
      return {
        job,
        fit: { score: r.score, matched_skills: r.matchedSkills, missing_skills: r.missingSkills, breakdown: r.breakdown },
        personal: { boost: p.boost, reasons: p.reasons, for_you: forYouScore(r.score, p.boost) },
        hidden: p.hidden,
      };
    })
    .filter((m) => !m.hidden)
    .sort((a, b) => b.personal.for_you - a.personal.for_you || b.fit.score - a.fit.score)
    .slice(0, limit)
    .map(({ hidden: _h, ...m }) => m);
}

/** Everything personalization needs about one user, in one round-trip. */
export async function personalProfile(user: UserRow): Promise<{ profile: PersonalProfile; dismissedIds: Set<string> }> {
  const rows = await sql<SignalJob & { id: string; kind: "applied" | "saved" | "dismissed"; reason: DismissReason | null }>(
    `SELECT j.id, j.title, j.company, j.location, j.seniority, j.skills, x.kind, x.reason::text AS reason
     FROM (
       SELECT job_id, 'applied' AS kind, NULL::dismiss_reason AS reason FROM applications
         WHERE user_id = $1 AND status <> 'draft'
       UNION ALL
       SELECT job_id, 'saved', NULL FROM saved_jobs WHERE user_id = $1
       UNION ALL
       SELECT job_id, 'dismissed', reason FROM job_dismissals WHERE user_id = $1
     ) x JOIN jobs j ON j.id = x.job_id
     LIMIT 1000`,
    [user.id],
  );
  const prefs = user.preferences ?? {};
  const profile = buildProfile({
    targetTitles: prefs.target_titles ?? [],
    salaryMin: prefs.salary_min ?? null,
    liked: rows.filter((r) => r.kind !== "dismissed").map((r) => ({ job: r, weight: r.kind === "applied" ? 3 : 2 })),
    dismissed: rows.filter((r) => r.kind === "dismissed").map((r) => ({ job: r, reason: r.reason ?? "other" })),
  });
  return { profile, dismissedIds: new Set(rows.filter((r) => r.kind === "dismissed").map((r) => r.id)) };
}

/** Skills that appear most often among a user's good-but-not-great matches — "what to learn next". */
export async function skillGaps(userId: string, limit = 5) {
  return sql<{ skill: string; jobs: number }>(
    `SELECT s.skill, count(*)::int AS jobs
     FROM fit_scores f, jsonb_array_elements_text(f.missing_skills) AS s(skill)
     WHERE f.user_id = $1 AND f.score BETWEEN 50 AND 85
     GROUP BY s.skill ORDER BY jobs DESC, s.skill LIMIT $2`,
    [userId, limit],
  );
}

export async function getJob(id: string) {
  return one<JobRow>("SELECT * FROM jobs WHERE id = $1", [id]);
}
