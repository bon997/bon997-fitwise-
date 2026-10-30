import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { JobSearchQuery, jobFacets, queryObject, searchJobs } from "@/lib/job-search";
import { hasProfile } from "@/lib/matching";
import { sql } from "@/lib/db";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Find jobs — Fitwise",
    title: "Find jobs",
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
  const sp = await searchParams;
  const raw = queryObject(
    Object.entries(sp).flatMap(([k, v]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x] as [string, string]))),
  );
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = T[locale];
  const personal = Boolean(user && hasProfile(user));

  // Signed-in users with a profile get the personalized ranking by default.
  const parsed = JobSearchQuery.safeParse({ sort: personal ? "for_you" : "relevance", ...raw });
  const params = parsed.success ? parsed.data : JobSearchQuery.parse({ sort: personal ? "for_you" : "relevance" });
  const [result, facets, savedRows] = await Promise.all([
    searchJobs(params, user),
    jobFacets(params, user),
    user ? sql<{ job_id: string }>("SELECT job_id FROM saved_jobs WHERE user_id = $1", [user.id]) : [],
  ]);
  const saved = new Set(savedRows.map((r) => r.job_id));

  const pageHref = (page: number) => {
    const q = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((x) => [k, x])));
    q.set("page", String(page));
    return `/jobs?${q}`;
  };

  return (
    <>
      <AppHeader user={user} active="/jobs" />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-display text-4xl">{t.title}</h1>

        <JobFilters
          values={{
            q: params.q,
            location: params.location,
            ort: params.ort,
            skill: params.skill,
            type: params.type,
            seniority: params.seniority,
            posted_within: params.posted_within,
            remote: params.remote,
            min_fit: personal ? params.min_fit : undefined,
            sort: params.sort,
          }}
          facets={facets}
          userSkills={user?.skills ?? []}
          personal={personal}
        />

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

        <h2 className="mt-6 text-sm font-normal text-muted" aria-live="polite">
          {result.total === 0 ? t.none : t.count(result.total)}
          {params.sort === "for_you" && result.total > 0 && t.rankedForYou}
        </h2>

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
      <Footer />
    </>
  );
}
