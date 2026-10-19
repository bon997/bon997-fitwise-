import { type RawJob, type SearchParams } from "./types";

type Label = { label?: string | null } | null | undefined;
type JobTechHit = {
  id: string;
  headline: string;
  webpage_url?: string | null;
  description?: { text?: string | null } | null;
  employer?: { name?: string | null } | null;
  workplace_address?: { municipality?: string | null; region?: string | null; country?: string | null } | null;
  working_hours_type?: Label;
  employment_type?: Label;
  salary_description?: string | null;
  application_details?: { url?: string | null } | null;
  must_have?: { skills?: Label[] } | null;
  nice_to_have?: { skills?: Label[] } | null;
  publication_date?: string | null;
};

const PAGE_SIZE = 10; // one import ≈ 10 jobs, same as Google Jobs, so AI costs stay predictable

/**
 * Platsbanken — Arbetsförmedlingen's open JobTech JobSearch API. Free, no key, Swedish listings.
 * Docs: https://jobsearch.api.jobtechdev.se
 */
export async function searchJobTech(p: SearchParams): Promise<RawJob[]> {
  const base = (process.env.NODE_ENV !== "production" && process.env.JOBTECH_URL) || "https://jobsearch.api.jobtechdev.se/search";
  const url = new URL(base);
  // Free-text search understands places ("Göteborg", "Stockholm") as well as job titles.
  url.searchParams.set("q", [p.query, p.location].filter(Boolean).join(" "));
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(((p.page ?? 1) - 1) * PAGE_SIZE));

  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Platsbanken ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { hits?: JobTechHit[] };
  return (data.hits ?? []).map(mapJobTechHit);
}

export function mapJobTechHit(h: JobTechHit): RawJob {
  const addr = h.workplace_address ?? {};
  const location = [addr.municipality, addr.region && addr.region !== addr.municipality ? addr.region : null]
    .filter(Boolean)
    .join(", ") || addr.country || null;
  const description = h.description?.text ?? "";
  const labels = (xs?: Label[]) => (xs ?? []).map((x) => x?.label).filter((x): x is string => Boolean(x));
  const must = labels(h.must_have?.skills);
  const nice = labels(h.nice_to_have?.skills);
  const requirements = [
    must.length ? `Required: ${must.join(", ")}` : "",
    nice.length ? `Nice to have: ${nice.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  return {
    source: "jobtech",
    externalId: String(h.id),
    title: h.headline,
    company: h.employer?.name ?? "Unknown employer",
    location,
    remote: /distans|remote|hemifrån|på distans/i.test(`${h.headline} ${description.slice(0, 2000)}`),
    employmentType: jobTechEmployment(h.working_hours_type?.label, h.employment_type?.label),
    description,
    requirements,
    responsibilities: [],
    salaryRange: h.salary_description?.trim() || null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    applyUrl: h.application_details?.url || h.webpage_url || null,
    postedAt: h.publication_date ? new Date(h.publication_date) : null,
  };
}

/** Swedish labels → our employment types. */
export function jobTechEmployment(hours?: string | null, kind?: string | null): string | null {
  const k = (kind ?? "").toLowerCase();
  if (/praktik|trainee|intern/.test(k)) return "internship";
  if (/behov|tidsbegräns|vikariat|projekt|sommarjobb|säsong|konsult/.test(k)) return "contract";
  const h = (hours ?? "").toLowerCase();
  if (h.includes("heltid")) return "full_time";
  if (h.includes("deltid")) return "part_time";
  return null;
}
