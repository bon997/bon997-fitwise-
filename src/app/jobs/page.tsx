import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { JobSearchQuery, searchJobs } from "@/lib/job-search";
import { hasProfile } from "@/lib/matching";
import { sql } from "@/lib/db";
import { AppHeader } from "@/components/app/AppHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { labels } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Find jobs — Fitwise",
    title: "Find jobs",
    keywords: "Keywords",
    keywordsPh: "Job title, skill or company",
    location: "Location",
    locationPh: "City or country",
    search: "Search",
    anyType: "Any type",
    jobType: "Job type",
    level: "Level",
    anyLevel: "Any level",
    posted: "Posted within",
    anyTime: "Any time",
    d1: "Last 24 hours",
    d7: "Last 7 days",
    d30: "Last 30 days",
    sortBy: "Sort by",
    forYou: "For you",
    relevant: "Most relevant",
    bestFit: "Best fit",
    newest: "Newest",
    salary: "Highest salary",
    remoteOnly: "Remote only",
    signIn: "Sign in",
    signInRest: "and add your resume to see your fit score on every job.",
    addSkills: "Add your skills",
    addSkillsRest: "to see your fit score on every job.",
    none: "No jobs found",
    count: (n: number) => `${n} job${n === 1 ? "" : "s"}`,
    rankedForYou: " · ranked for you by fit and what you've saved or passed on",
    empty: "Try fewer filters or a broader search.",
    pagination: "Pagination",
    prev: "← Previous",
    next: "Next →",
    page: (p: number, n: number) => `Page ${p} of ${n}`,
  },
  sv: {
    meta: "Hitta jobb — Fitwise",
    title: "Hitta jobb",
    keywords: "Sökord",
    keywordsPh: "Yrke, kompetens eller företag",
    location: "Ort",
    locationPh: "Stad eller land",
    search: "Sök",
    anyType: "Alla anställningsformer",
    jobType: "Anställningsform",
    level: "Nivå",
    anyLevel: "Alla nivåer",
    posted: "Publicerad",
    anyTime: "När som helst",
    d1: "Senaste dygnet",
    d7: "Senaste 7 dagarna",
    d30: "Senaste 30 dagarna",
    sortBy: "Sortera efter",
    forYou: "För dig",
    relevant: "Mest relevanta",
    bestFit: "Bäst matchning",
    newest: "Nyaste",
    salary: "Högst lön",
    remoteOnly: "Endast distans",
    signIn: "Logga in",
    signInRest: "och lägg till ditt CV för att se din matchningspoäng på varje jobb.",
    addSkills: "Lägg till dina kompetenser",
    addSkillsRest: "för att se din matchningspoäng på varje jobb.",
    none: "Inga jobb hittades",
    count: (n: number) => `${n} jobb`,
    rankedForYou: " · sorterade för dig efter matchning och vad du sparat eller valt bort",
    empty: "Prova färre filter eller en bredare sökning.",
    pagination: "Sidor",
    prev: "← Föregående",
    next: "Nästa →",
    page: (p: number, n: number) => `Sida ${p} av ${n}`,
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({ searchParams }: { searchParams: SP }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== ""));
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = T[locale];
  const L = labels(locale);
  const personal = Boolean(user && hasProfile(user));

  // Signed-in users with a profile get the personalized ranking by default.
  const parsed = JobSearchQuery.safeParse({ sort: personal ? "for_you" : "relevance", ...raw });
  const params = parsed.success ? parsed.data : JobSearchQuery.parse({ sort: personal ? "for_you" : "relevance" });
  const [result, savedRows] = await Promise.all([
    searchJobs(params, user),
    user ? sql<{ job_id: string }>("SELECT job_id FROM saved_jobs WHERE user_id = $1", [user.id]) : [],
  ]);
  const saved = new Set(savedRows.map((r) => r.job_id));

  const pageHref = (page: number) => {
    const q = new URLSearchParams(Object.entries(raw).filter(([, v]) => v) as [string, string][]);
    q.set("page", String(page));
    return `/jobs?${q}`;
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40";

  return (
    <>
      <AppHeader user={user} active="/jobs" />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-display text-4xl">{t.title}</h1>

        <form className="mt-6 rounded-2xl border border-line bg-paper-2/50 p-4" role="search">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <label className="sr-only" htmlFor="q">{t.keywords}</label>
            <input id="q" name="q" defaultValue={params.q ?? ""} placeholder={t.keywordsPh} className={input} />
            <label className="sr-only" htmlFor="location">{t.location}</label>
            <input id="location" name="location" defaultValue={params.location ?? ""} placeholder={t.locationPh} className={input} />
            <button className="rounded-xl bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:bg-ink-2">{t.search}</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <select name="type" defaultValue={params.type ?? ""} aria-label={t.jobType} className={`${input} sm:w-auto`}>
              <option value="">{t.anyType}</option>
              {Object.entries(L.type).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="seniority" defaultValue={params.seniority ?? ""} aria-label={t.level} className={`${input} sm:w-auto`}>
              <option value="">{t.anyLevel}</option>
              {Object.entries(L.seniority).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="posted_within" defaultValue={params.posted_within?.toString() ?? ""} aria-label={t.posted} className={`${input} sm:w-auto`}>
              <option value="">{t.anyTime}</option>
              <option value="1">{t.d1}</option>
              <option value="7">{t.d7}</option>
              <option value="30">{t.d30}</option>
            </select>
            <select name="sort" defaultValue={params.sort} aria-label={t.sortBy} className={`${input} sm:w-auto`}>
              {personal && <option value="for_you">{t.forYou}</option>}
              <option value="relevance">{t.relevant}</option>
              {personal && <option value="fit">{t.bestFit}</option>}
              <option value="recent">{t.newest}</option>
              <option value="salary">{t.salary}</option>
            </select>
            <label className="col-span-2 flex items-center gap-2 text-sm text-ink-2 sm:col-span-1 sm:ml-1">
              <input type="checkbox" name="remote" value="true" defaultChecked={params.remote === true} className="h-4 w-4 accent-[var(--color-accent)]" />
              {t.remoteOnly}
            </label>
          </div>
        </form>

        {!user && (
          <p className="mt-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-2">
            <Link href="/login?returnTo=/jobs" className="font-medium text-accent underline underline-offset-2">{t.signIn}</Link> {t.signInRest}
          </p>
        )}
        {user && !personal && (
          <p className="mt-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-2">
            <Link href="/profile" className="font-medium text-accent underline underline-offset-2">{t.addSkills}</Link> {t.addSkillsRest}
          </p>
        )}

        <p className="mt-6 text-sm text-muted" aria-live="polite">
          {result.total === 0 ? t.none : t.count(result.total)}
          {params.sort === "for_you" && result.total > 0 && t.rankedForYou}
        </p>

        {result.total === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line p-10 text-center text-ink-2">
            {t.empty}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {result.jobs.map((j) => (
              <JobCard key={j.id} job={j} saved={saved.has(j.id)} signedIn={Boolean(user)} />
            ))}
          </div>
        )}

        {result.total_pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-4 text-sm" aria-label={t.pagination}>
            {params.page > 1 ? <Link href={pageHref(params.page - 1)} className="rounded-full border border-line px-4 py-2 hover:border-ink/40">{t.prev}</Link> : <span />}
            <span className="text-muted">{t.page(params.page, result.total_pages)}</span>
            {params.page < result.total_pages ? <Link href={pageHref(params.page + 1)} className="rounded-full border border-line px-4 py-2 hover:border-ink/40">{t.next}</Link> : <span />}
          </nav>
        )}
      </main>
    </>
  );
}
