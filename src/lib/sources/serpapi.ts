import { type RawJob, type SearchParams, parseRelativeDate, employmentType } from "./types";

type SerpJob = {
  job_id: string;
  title: string;
  company_name: string;
  location?: string;
  description?: string;
  job_highlights?: { title?: string; items?: string[] }[];
  detected_extensions?: { posted_at?: string; schedule_type?: string; work_from_home?: boolean; salary?: string };
  apply_options?: { link?: string }[];
  share_link?: string;
};

/** Google Jobs via SerpAPI. Docs: https://serpapi.com/google-jobs-api */
export async function searchSerpApi(p: SearchParams & { nextPageToken?: string }): Promise<{ jobs: RawJob[]; nextPageToken?: string }> {
  const location = p.location?.trim();
  if (!location || p.nextPageToken) return serpRequest(p.query, location, p.nextPageToken);

  // SerpAPI's `location` must be one of Google's canonical names ("Gothenburg, Västra Götaland
  // County, Sweden"), so everyday spellings like "Göteborg" are rejected and a bare "Stockholm" can
  // come back empty. Google Jobs understands the place inside the query just fine, so fall back to that.
  try {
    const first = await serpRequest(p.query, location);
    if (first.jobs.length > 0) return first;
  } catch (e) {
    if (!(e instanceof Error && /location/i.test(e.message))) throw e;
  }
  return serpRequest(`${p.query} ${location}`);
}

async function serpRequest(q: string, location?: string, nextPageToken?: string): Promise<{ jobs: RawJob[]; nextPageToken?: string }> {
  const key = process.env.SERPAPI_KEY?.trim();
  if (!key) throw new Error("SERPAPI_KEY is not set");

  // Overridable outside production only, so imports can be tested against a local fake.
  const base = (process.env.NODE_ENV !== "production" && process.env.SERPAPI_URL) || "https://serpapi.com/search.json";
  const url = new URL(base);
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", q);
  if (location) url.searchParams.set("location", location);
  if (nextPageToken) url.searchParams.set("next_page_token", nextPageToken);
  url.searchParams.set("api_key", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    jobs_results?: SerpJob[];
    serpapi_pagination?: { next_page_token?: string };
    error?: string;
  };
  // "No results" arrives as 200 with an error string; that's an empty page, not a failure.
  if (data.error && !/hasn't returned any results/i.test(data.error)) throw new Error(`SerpAPI: ${data.error}`);

  return { jobs: (data.jobs_results ?? []).map(mapSerpJob), nextPageToken: data.serpapi_pagination?.next_page_token };
}

export function mapSerpJob(j: SerpJob): RawJob {
  const section = (name: string) =>
    j.job_highlights?.find((h) => h.title?.toLowerCase().includes(name))?.items ?? [];
  const ext = j.detected_extensions ?? {};
  const location = j.location?.trim() || null;
  return {
    source: "serpapi",
    externalId: j.job_id,
    title: j.title,
    company: j.company_name,
    location,
    remote: Boolean(ext.work_from_home) || /remote|anywhere/i.test(location ?? ""),
    employmentType: employmentType(ext.schedule_type),
    description: j.description ?? "",
    requirements: section("qualification").join("\n"),
    responsibilities: section("responsibilit"),
    salaryRange: ext.salary ?? null,
    salaryMin: null, // SerpAPI gives a free-text salary only
    salaryMax: null,
    salaryCurrency: null,
    applyUrl: j.apply_options?.[0]?.link ?? j.share_link ?? null,
    postedAt: parseRelativeDate(ext.posted_at),
  };
}
