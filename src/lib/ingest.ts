/**
 * Ingestion pipeline: fetch → upsert → extract skills with Claude → embed in Pinecone.
 * Idempotent: (source, external_id) is unique, so re-running a query only updates.
 */
import { sql, one } from "./db";
import { searchSerpApi } from "./sources/serpapi";
import { searchJSearch } from "./sources/rapidapi";
import type { RawJob } from "./sources/types";
import { extractJobSignals } from "./ai/extract-job";
import { upsertJobs, jobEmbeddingText } from "./search/pinecone";
import type { JobRow } from "./data";

export type IngestRequest = { source: "serpapi" | "rapidapi"; query: string; location?: string; pages?: number };

async function fetchRaw(r: IngestRequest): Promise<RawJob[]> {
  const pages = Math.min(Math.max(r.pages ?? 1, 1), 5);
  const all: RawJob[] = [];
  if (r.source === "rapidapi") {
    for (let page = 1; page <= pages; page++) all.push(...(await searchJSearch({ ...r, page })));
  } else {
    let token: string | undefined;
    for (let i = 0; i < pages; i++) {
      const res = await searchSerpApi({ ...r, nextPageToken: token });
      all.push(...res.jobs);
      token = res.nextPageToken;
      if (!token) break;
    }
  }
  return all;
}

async function upsertRaw(j: RawJob): Promise<{ id: string; inserted: boolean; changed: boolean }> {
  // xmax = 0 identifies a fresh insert. Skills are cleared only if the text changed, forcing re-extraction.
  const row = await one<{ id: string; inserted: boolean; changed: boolean }>(
    `INSERT INTO jobs (source, external_id, title, company, location, remote, employment_type, description,
                       requirements, responsibilities, salary_range, salary_min, salary_max, salary_currency, apply_url, posted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (source, external_id) DO UPDATE SET
       title = EXCLUDED.title, company = EXCLUDED.company, location = EXCLUDED.location,
       remote = EXCLUDED.remote, employment_type = EXCLUDED.employment_type,
       description = EXCLUDED.description, requirements = EXCLUDED.requirements,
       responsibilities = CASE WHEN jsonb_array_length(EXCLUDED.responsibilities) > 0
                               THEN EXCLUDED.responsibilities ELSE jobs.responsibilities END,
       salary_range = EXCLUDED.salary_range, salary_min = EXCLUDED.salary_min, salary_max = EXCLUDED.salary_max,
       salary_currency = EXCLUDED.salary_currency, apply_url = EXCLUDED.apply_url,
       posted_at = coalesce(jobs.posted_at, EXCLUDED.posted_at), is_active = true,
       skills = CASE WHEN jobs.description IS DISTINCT FROM EXCLUDED.description
                       OR jobs.requirements IS DISTINCT FROM EXCLUDED.requirements
                     THEN '[]'::jsonb ELSE jobs.skills END
     RETURNING id, (xmax = 0) AS inserted, (skills = '[]'::jsonb) AS changed`,
    [
      j.source, j.externalId, j.title, j.company, j.location, j.remote, j.employmentType, j.description,
      j.requirements, JSON.stringify(j.responsibilities), j.salaryRange, j.salaryMin, j.salaryMax,
      j.salaryCurrency, j.applyUrl, j.postedAt,
    ],
  );
  return row!;
}

/** Run fn over items with at most `n` in flight. */
async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

/** Extract skills for jobs that don't have them yet. Safe to call on its own (e.g. after manual inserts). */
export async function enrichJobs(ids: string[]): Promise<{ enriched: number; failed: number }> {
  const jobs = await sql<JobRow>("SELECT * FROM jobs WHERE id = ANY($1::uuid[]) AND skills = '[]'::jsonb", [ids]);
  let enriched = 0;
  let failed = 0;
  await pool(jobs, 5, async (j) => {
    try {
      const x = await extractJobSignals(j);
      await sql(
        `UPDATE jobs SET skills = $2, seniority = $3, min_years = $4,
           remote = remote OR $5,
           responsibilities = CASE WHEN jsonb_array_length(responsibilities) = 0 THEN $6 ELSE responsibilities END
         WHERE id = $1`,
        [j.id, JSON.stringify(x.skills), x.seniority, x.min_years, x.remote, JSON.stringify(x.responsibilities)],
      );
      enriched++;
    } catch (e) {
      failed++;
      console.error(`enrich ${j.id} failed`, e);
    }
  });

  // Embed whatever now has skills.
  const ready = await sql<JobRow>("SELECT * FROM jobs WHERE id = ANY($1::uuid[]) AND skills <> '[]'::jsonb", [ids]);
  await upsertJobs(
    ready.map((j) => ({ id: j.id, text: jobEmbeddingText(j), location: j.location, remote: j.remote, postedAt: j.posted_at })),
  );
  if (ready.length) await sql("UPDATE jobs SET embedded_at = now() WHERE id = ANY($1::uuid[])", [ready.map((j) => j.id)]);
  return { enriched, failed };
}

export async function runIngest(r: IngestRequest) {
  const run = await one<{ id: string }>("INSERT INTO ingest_runs (source, query) VALUES ($1, $2) RETURNING id", [
    r.source,
    r.location ? `${r.query} @ ${r.location}` : r.query,
  ]);
  try {
    const raw = await fetchRaw(r);
    let inserted = 0;
    let updated = 0;
    const needsEnrich: string[] = [];
    for (const j of raw) {
      if (!j.externalId || !j.title || !j.company) continue;
      const res = await upsertRaw(j);
      if (res.inserted) inserted++;
      else updated++;
      if (res.changed) needsEnrich.push(res.id);
    }
    const enrich = await enrichJobs(needsEnrich);
    await sql("UPDATE ingest_runs SET fetched=$2, inserted=$3, updated=$4, finished_at=now() WHERE id=$1", [
      run!.id, raw.length, inserted, updated,
    ]);
    return { runId: run!.id, fetched: raw.length, inserted, updated, ...enrich };
  } catch (e) {
    await sql("UPDATE ingest_runs SET error=$2, finished_at=now() WHERE id=$1", [run!.id, String(e).slice(0, 1000)]);
    throw e;
  }
}
