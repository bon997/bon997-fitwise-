/**
 * The nightly job import: runs the searches saved on the admin page with no
 * manual work. One run (Vercel Cron, see vercel.json):
 *
 *   1. runs each enabled search, least recently run first, newest ads first
 *      (fast: fetch and store only),
 *   2. reads skills for new jobs with Claude while time is left (what's left
 *      is picked up by the next run or the next manual import),
 *   3. hides duplicate ads and jobs that have been up for too long.
 *
 * Everything stays inside one 60-second function run, so it works on every
 * Vercel plan. If there are more searches than fit, the next night continues
 * with the ones that waited longest.
 */
import { one, sql } from "./db";
import { enrichJobs, hideDuplicateJobs, importJobs, NEEDS_SKILLS_SQL, type IngestRequest } from "./ingest";

/** Stop starting new searches after this long, leaving time to read skills. */
export const SEARCH_BUDGET_MS = 25_000;
/** Stop reading skills after this long, inside the route's 60-second limit. */
export const TOTAL_BUDGET_MS = 50_000;
/** Jobs whose ad has been up longer than this are hidden from search and matches. */
export const JOB_MAX_AGE_DAYS = Number(process.env.JOB_MAX_AGE_DAYS ?? 45);

export type ImportSearch = {
  id: string;
  source: IngestRequest["source"];
  query: string;
  location: string | null;
  pages: number;
  enabled: boolean;
  last_run_at: Date | null;
  last_result: string | null;
  created_at: Date;
};

export type ScheduledImportResult = {
  searches: { id: string; query: string; result: string }[];
  skipped: number;
  fetched: number;
  inserted: number;
  enriched: number;
  /** Jobs that got their employer's Platsbanken tags because the AI was unavailable. */
  tagged: number;
  enrichFailed: number;
  enrichError?: string;
  duplicatesHidden: number;
  expired: number;
};

/** Keys a source needs; a search for a source without its key is skipped with a clear note. */
export function sourceReady(source: IngestRequest["source"]): boolean {
  if (source === "serpapi") return Boolean(process.env.SERPAPI_KEY);
  if (source === "rapidapi") return Boolean(process.env.RAPIDAPI_KEY);
  return true; // Platsbanken is free and needs no key
}

/** Short summary stored on the search, shown on the admin page. */
export const summary = (r: { fetched: number; inserted: number; duplicates: number }) =>
  `${r.fetched} found · ${r.inserted} new${r.duplicates ? ` · ${r.duplicates} duplicates skipped` : ""}`;

export async function hideExpiredJobs(maxAgeDays = JOB_MAX_AGE_DAYS): Promise<number> {
  const rows = await sql(
    `UPDATE jobs SET is_active = false
     WHERE is_active AND coalesce(posted_at, created_at) < now() - make_interval(days => $1)
     RETURNING 1`,
    [maxAgeDays],
  );
  return rows.length;
}

export async function runScheduledImport(opts: { now?: () => number } = {}): Promise<ScheduledImportResult> {
  const now = opts.now ?? Date.now;
  const started = now();
  const result: ScheduledImportResult = { searches: [], skipped: 0, fetched: 0, inserted: 0, enriched: 0, tagged: 0, enrichFailed: 0, duplicatesHidden: 0, expired: 0 };

  // 1. Searches, the longest-waiting first.
  const searches = await sql<ImportSearch>(
    "SELECT * FROM import_searches WHERE enabled ORDER BY last_run_at NULLS FIRST, created_at",
  );
  const fresh: string[] = [];
  for (const s of searches) {
    if (now() - started > SEARCH_BUDGET_MS) {
      result.skipped = searches.length - result.searches.length;
      break;
    }
    let note: string;
    if (!sourceReady(s.source)) {
      note = "Skipped: this source's API key isn't set";
    } else {
      try {
        const r = await importJobs({ source: s.source, query: s.query, location: s.location ?? undefined, pages: s.pages, newestFirst: true });
        fresh.push(...r.needsEnrich);
        result.fetched += r.fetched;
        result.inserted += r.inserted;
        note = summary(r);
      } catch (e) {
        note = `Failed: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
      }
    }
    await sql("UPDATE import_searches SET last_run_at = now(), last_result = $2 WHERE id = $1", [s.id, note]);
    result.searches.push({ id: s.id, query: s.location ? `${s.query} @ ${s.location}` : s.query, result: note });
  }

  // 2. Read skills, this run's new jobs first, then older ones still waiting, in small batches.
  //    With no AI (no key, no credit) Platsbanken jobs get their employer's own tags instead,
  //    and the AI replaces those on a later night once it works again.
  {
    const queue = [...fresh];
    const tried = new Set<string>();
    let aiDown = !process.env.ANTHROPIC_API_KEY?.trim();
    while (now() - started < TOTAL_BUDGET_MS) {
      if (queue.length === 0) {
        // While the AI is down only empty jobs are worth a pass; tagged ones wait for the AI.
        const waiting = aiDown ? "skills = '[]'::jsonb" : NEEDS_SKILLS_SQL;
        const backlog = await sql<{ id: string }>(
          `SELECT id FROM jobs WHERE is_active AND ${waiting} ORDER BY coalesce(posted_at, created_at) DESC LIMIT 10`,
        );
        // Skip ids this run already tried, so one bad ad can't loop forever.
        queue.push(...backlog.map((b) => b.id).filter((id) => !tried.has(id)));
        if (queue.length === 0) break;
      }
      const batch = queue.splice(0, 10);
      batch.forEach((id) => tried.add(id));
      const r = await enrichJobs(batch, { skipAi: aiDown });
      result.enriched += r.enriched;
      result.tagged += r.tagged;
      result.enrichFailed += r.failed;
      if (typeof r.enrich_error === "string") result.enrichError ??= r.enrich_error;
      // A missing key or used-up credit fails every job: stop calling the AI, keep tagging.
      if (r.aiDown) aiDown = true;
    }
  }

  // 3. Tidy up.
  result.duplicatesHidden = await hideDuplicateJobs();
  result.expired = await hideExpiredJobs();
  return result;
}

/** Rough jobs per night for the admin page: about 10 per page. */
export async function nightlyEstimate(): Promise<number> {
  const row = await one<{ pages: number }>("SELECT coalesce(sum(pages), 0)::int AS pages FROM import_searches WHERE enabled");
  return (row?.pages ?? 0) * 10;
}
