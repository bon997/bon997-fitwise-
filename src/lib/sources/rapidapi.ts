import { type RawJob, type SearchParams, toYearly, employmentType } from "./types";

type JSearchJob = {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_is_remote?: boolean;
  job_employment_type?: string | null;
  job_description?: string;
  job_apply_link?: string | null;
  job_posted_at_datetime_utc?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
  job_highlights?: { Qualifications?: string[]; Responsibilities?: string[] };
};

/** JSearch on RapidAPI. Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch */
export async function searchJSearch(p: SearchParams): Promise<RawJob[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY is not set");
  const host = "jsearch.p.rapidapi.com";

  const url = new URL(`https://${host}/search`);
  url.searchParams.set("query", p.location ? `${p.query} in ${p.location}` : p.query);
  url.searchParams.set("page", String(p.page ?? 1));
  url.searchParams.set("num_pages", "1");

  const res = await fetch(url, {
    headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`JSearch ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { data?: JSearchJob[] };
  return (data.data ?? []).map(mapJSearchJob);
}

export function mapJSearchJob(j: JSearchJob): RawJob {
  const location = [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || null;
  const min = toYearly(j.job_min_salary, j.job_salary_period);
  const max = toYearly(j.job_max_salary, j.job_salary_period);
  const cur = j.job_salary_currency ?? null;
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  return {
    source: "rapidapi",
    externalId: j.job_id,
    title: j.job_title,
    company: j.employer_name,
    location,
    remote: Boolean(j.job_is_remote),
    employmentType: employmentType(j.job_employment_type),
    description: j.job_description ?? "",
    requirements: (j.job_highlights?.Qualifications ?? []).join("\n"),
    responsibilities: j.job_highlights?.Responsibilities ?? [],
    salaryRange: min && max ? `${fmt(min)}–${fmt(max)} ${cur ?? ""} / yr`.replace(/\s+\//, " /") : null,
    salaryMin: min,
    salaryMax: max != null && min != null && max < min ? min : max,
    salaryCurrency: cur,
    applyUrl: j.job_apply_link ?? null,
    postedAt: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : null,
  };
}
