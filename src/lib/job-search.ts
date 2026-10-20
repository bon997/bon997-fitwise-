/** Job search: Postgres full-text + filters, optionally ranked by fit or the personalized "For you" score. */
import { z } from "zod";
import { sql } from "./db";
import { JOB_LIST_COLUMNS, publicFit, type JobRow, type UserRow } from "./data";
import { fitScoresFor, hasProfile, personalProfile } from "./matching";
import { personalize, forYouScore } from "./ai/personalize";
import { SENIORITY } from "./ai/fit-score";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");
/** Accepts ?x=a&x=b (or a single ?x=a) and always yields an array. */
const many = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v == null || v === "" ? undefined : Array.isArray(v) ? v.filter((x) => x !== "") : [v]), z.array(item).max(30).optional());

/** Search-param keys that may repeat (multi-select filters). */
export const MULTI_KEYS = ["ort", "skill", "type", "seniority"] as const;

/** URLSearchParams / Next searchParams → plain object, keeping repeated filter keys as arrays. */
export function queryObject(entries: Iterable<[string, string]>): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of entries) {
    if (v === "") continue;
    if ((MULTI_KEYS as readonly string[]).includes(k)) out[k] = [...((out[k] as string[]) ?? []), v];
    else out[k] = v;
  }
  return out;
}

/** "r:Stockholms län" selects a whole region (län); anything else is a municipality (kommun). */
export const REGION_PREFIX = "r:";

export const JobSearchQuery = z.object({
  q: z.string().trim().max(200).optional(),
  location: z.string().trim().max(100).optional().describe("free text, matched anywhere in the location"),
  ort: many(z.string().trim().min(1).max(100)).describe("municipalities, or r:<region> for a whole län"),
  skill: many(z.string().trim().min(1).max(80)),
  remote: bool.optional(),
  type: many(z.enum(["full_time", "part_time", "contract", "internship"])),
  seniority: many(z.enum(SENIORITY)),
  salary_min: z.coerce.number().int().min(0).optional(),
  posted_within: z.coerce.number().int().min(1).max(90).optional().describe("days"),
  min_fit: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["relevance", "recent", "fit", "for_you", "salary"]).default("relevance"),
  include_dismissed: bool.optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});
export type JobSearchQuery = z.infer<typeof JobSearchQuery>;

type Facet = "ort" | "skill" | "type" | "seniority";

const MUNICIPALITY = "nullif(trim(split_part(j.location, ',', 1)), '')";
// Google Jobs locations end in the country; only Swedish län count as a region.
const REGION = "nullif(nullif(nullif(trim(split_part(j.location, ',', 2)), ''), 'Sweden'), 'Sverige')";

/** WHERE clause for a search. `skip` leaves out one filter so its own option counts stay useful. */
function buildWhere(params: JobSearchQuery, user: UserRow | null, skip?: Facet) {
  const where: string[] = ["j.is_active"];
  const args: unknown[] = [];
  const arg = (v: unknown) => `$${args.push(v)}`;

  let rank: string | null = null;
  if (params.q) {
    const q = arg(params.q);
    // Full text, plus a plain substring on the title so Swedish compounds ("lagerarbetare") still match.
    where.push(`(j.search_vector @@ websearch_to_tsquery('english', ${q}) OR j.title ILIKE ${arg(`%${params.q}%`)})`);
    rank = `ts_rank(j.search_vector, websearch_to_tsquery('english', ${q}))`;
  }
  if (params.location) where.push(`(j.location ILIKE ${arg(`%${params.location}%`)} OR j.remote)`);
  if (params.ort?.length && skip !== "ort") {
    const regions = params.ort.filter((o) => o.startsWith(REGION_PREFIX)).map((o) => o.slice(REGION_PREFIX.length).toLowerCase());
    const towns = params.ort.filter((o) => !o.startsWith(REGION_PREFIX)).map((o) => o.toLowerCase());
    where.push(`(lower(${MUNICIPALITY}) = ANY(${arg(towns)}::text[]) OR lower(${REGION}) = ANY(${arg(regions)}::text[]))`);
  }
  if (params.skill?.length && skip !== "skill") {
    // Every chosen skill must be in the ad, like ticking several boxes on Platsbanken narrows the list.
    where.push(`(SELECT count(DISTINCT lower(s->>'name')) FROM jsonb_array_elements(j.skills) s
                 WHERE lower(s->>'name') = ANY(${arg(params.skill.map((x) => x.toLowerCase()))}::text[])) = ${arg(new Set(params.skill.map((x) => x.toLowerCase())).size)}`);
  }
  if (params.remote !== undefined) where.push(`j.remote = ${arg(params.remote)}`);
  if (params.type?.length && skip !== "type") where.push(`j.employment_type::text = ANY(${arg(params.type)}::text[])`);
  if (params.seniority?.length && skip !== "seniority") where.push(`j.seniority::text = ANY(${arg(params.seniority)}::text[])`);
  if (params.salary_min) where.push(`coalesce(j.salary_max, j.salary_min) >= ${arg(params.salary_min)}`);
  if (params.posted_within) {
    where.push(`coalesce(j.posted_at, j.created_at) >= now() - make_interval(days => ${arg(params.posted_within)})`);
  }
  if (user && !params.include_dismissed) {
    const uid = arg(user.id);
    where.push(`NOT EXISTS (SELECT 1 FROM job_dismissals d WHERE d.job_id = j.id AND d.user_id = ${uid})`);
    // "Hide this company": drop every job from companies the user dismissed for that reason.
    where.push(`lower(j.company) NOT IN (SELECT lower(dj.company) FROM job_dismissals d JOIN jobs dj ON dj.id = d.job_id
                WHERE d.user_id = ${uid} AND d.reason = 'company')`);
  }
  return { where, args, arg, rank };
}

export type JobFacets = {
  places: { town: string; region: string | null; count: number }[];
  skills: { skill: string; count: number }[];
  types: Record<string, number>;
  seniority: Record<string, number>;
};

/**
 * Option counts for the filter menus (like "Stockholm (228)" on Platsbanken).
 * Each menu's counts respect every other filter but not its own, so ticking a second town still shows numbers.
 */
export async function jobFacets(params: JobSearchQuery, user: UserRow | null): Promise<JobFacets> {
  const q = (skip: Facet, select: string, group: string, limit: number) => {
    const { where, args } = buildWhere(params, user, skip);
    return sql<Record<string, unknown> & { n: string }>(
      `SELECT ${select}, count(DISTINCT j.id) AS n FROM jobs j ${skip === "skill" ? ", jsonb_array_elements(j.skills) s" : ""}
       WHERE ${where.join(" AND ")} GROUP BY ${group} ORDER BY n DESC, 1 LIMIT ${limit}`,
      args,
    );
  };
  const [places, skills, types, seniority] = await Promise.all([
    q("ort", `${MUNICIPALITY} AS town, ${REGION} AS region`, "1, 2", 300),
    q("skill", "lower(s->>'name') AS skill", "1", 80),
    q("type", "j.employment_type AS v", "1", 10),
    q("seniority", "j.seniority AS v", "1", 10),
  ]);
  const counts = (rows: (Record<string, unknown> & { n: string })[]) =>
    Object.fromEntries(rows.filter((r) => r.v).map((r) => [String(r.v), Number(r.n)]));
  return {
    places: places.filter((r) => r.town).map((r) => ({ town: String(r.town), region: (r.region as string | null) ?? null, count: Number(r.n) })),
    skills: skills.filter((r) => r.skill).map((r) => ({ skill: String(r.skill), count: Number(r.n) })),
    types: counts(types),
    seniority: counts(seniority),
  };
}

export async function searchJobs(params: JobSearchQuery, user: UserRow | null) {
  const { where, args, arg, rank } = buildWhere(params, user);
  // Fit-based sort/filter needs scores for the whole result set, so it ranks over
  // the top 300 by relevance/recency and scores those (cached after first time).
  const signedIn = Boolean(user && hasProfile(user));
  const byFit = signedIn && (params.sort === "fit" || params.sort === "for_you" || Boolean(params.min_fit));

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
