/** Job search: Postgres full-text + filters, optionally ranked by fit or the personalized "For you" score. */
import { z } from "zod";
import { sql } from "./db";
import { JOB_LIST_COLUMNS, publicFit, type JobRow, type UserRow } from "./data";
import { fitScoresFor, hasProfile, personalProfile } from "./matching";
import { personalize, forYouScore } from "./ai/personalize";
import { SENIORITY } from "./ai/fit-score";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

export const JobSearchQuery = z.object({
  q: z.string().trim().max(200).optional(),
  location: z.string().trim().max(100).optional(),
  remote: bool.optional(),
  type: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
  seniority: z.enum(SENIORITY).optional(),
  salary_min: z.coerce.number().int().min(0).optional(),
  posted_within: z.coerce.number().int().min(1).max(90).optional().describe("days"),
  min_fit: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["relevance", "recent", "fit", "for_you", "salary"]).default("relevance"),
  include_dismissed: bool.optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});
export type JobSearchQuery = z.infer<typeof JobSearchQuery>;

export async function searchJobs(params: JobSearchQuery, user: UserRow | null) {
  const where: string[] = ["j.is_active"];
  const args: unknown[] = [];
  const arg = (v: unknown) => `$${args.push(v)}`;

  let rank: string | null = null;
  if (params.q) {
    const q = arg(params.q);
    where.push(`j.search_vector @@ websearch_to_tsquery('english', ${q})`);
    rank = `ts_rank(j.search_vector, websearch_to_tsquery('english', ${q}))`;
  }
  if (params.location) where.push(`(j.location ILIKE ${arg(`%${params.location}%`)} OR j.remote)`);
  if (params.remote !== undefined) where.push(`j.remote = ${arg(params.remote)}`);
  if (params.type) where.push(`j.employment_type = ${arg(params.type)}`);
  if (params.seniority) where.push(`j.seniority = ${arg(params.seniority)}`);
  if (params.salary_min) where.push(`coalesce(j.salary_max, j.salary_min) >= ${arg(params.salary_min)}`);
  if (params.posted_within) {
    where.push(`coalesce(j.posted_at, j.created_at) >= now() - make_interval(days => ${arg(params.posted_within)})`);
  }

  // Fit-based sort/filter needs scores for the whole result set, so it ranks over
  // the top 300 by relevance/recency and scores those (cached after first time).
  const signedIn = Boolean(user && hasProfile(user));
  const byFit = signedIn && (params.sort === "fit" || params.sort === "for_you" || Boolean(params.min_fit));
  if (user && !params.include_dismissed) {
    const uid = arg(user.id);
    where.push(`NOT EXISTS (SELECT 1 FROM job_dismissals d WHERE d.job_id = j.id AND d.user_id = ${uid})`);
    // "Hide this company": drop every job from companies the user dismissed for that reason.
    where.push(`lower(j.company) NOT IN (SELECT lower(dj.company) FROM job_dismissals d JOIN jobs dj ON dj.id = d.job_id
                WHERE d.user_id = ${uid} AND d.reason = 'company')`);
  }

  const order = {
    relevance: `${rank ? `${rank} DESC, ` : ""}coalesce(j.posted_at, j.created_at) DESC`,
    recent: "coalesce(j.posted_at, j.created_at) DESC",
    salary: "coalesce(j.salary_max, j.salary_min) DESC NULLS LAST",
    fit: `${rank ? `${rank} DESC, ` : ""}coalesce(j.posted_at, j.created_at) DESC`,
    for_you: `${rank ? `${rank} DESC, ` : ""}coalesce(j.posted_at, j.created_at) DESC`,
  }[params.sort];

  const limit = byFit ? 300 : params.per_page;
  const offset = byFit ? 0 : (params.page - 1) * params.per_page;

  const rows = await sql<JobRow & { total: string }>(
    `SELECT ${JOB_LIST_COLUMNS}, count(*) OVER () AS total
     FROM jobs j WHERE ${where.join(" AND ")}
     ORDER BY ${order}, j.id
     LIMIT ${arg(limit)} OFFSET ${arg(offset)}`,
    args,
  );

  let total = Number(rows[0]?.total ?? 0);
  let page = rows;
  const [fits, personal] = signedIn
    ? await Promise.all([fitScoresFor(user!, rows.map((r) => r.id)), personalProfile(user!)])
    : [new Map(), null];

  const personalFor = new Map(
    personal
      ? rows.map((r) => {
          const p = personalize(r, personal.profile);
          const fit = fits.get(r.id)?.score ?? 0;
          return [r.id, { boost: p.boost, reasons: p.reasons, hidden: p.hidden, for_you: forYouScore(fit, p.boost) }];
        })
      : [],
  );

  if (byFit) {
    let scored = rows
      .filter((r) => !personalFor.get(r.id)?.hidden)
      .map((r) => ({ r, s: fits.get(r.id)?.score ?? -1, fy: personalFor.get(r.id)?.for_you ?? -1 }));
    if (params.min_fit) scored = scored.filter((x) => x.s >= params.min_fit!);
    if (params.sort === "fit") scored.sort((a, b) => b.s - a.s);
    if (params.sort === "for_you") scored.sort((a, b) => b.fy - a.fy || b.s - a.s);
    total = scored.length;
    const start = (params.page - 1) * params.per_page;
    page = scored.slice(start, start + params.per_page).map((x) => x.r);
  }

  return {
    jobs: page.map(({ total: _t, ...j }) => {
      const p = personalFor.get(j.id);
      return {
        ...j,
        fit: publicFit(fits.get(j.id)),
        personal: p ? { boost: p.boost, reasons: p.reasons, for_you: p.for_you } : null,
      };
    }),
    page: params.page,
    per_page: params.per_page,
    total,
    total_pages: Math.ceil(total / params.per_page),
  };
}
