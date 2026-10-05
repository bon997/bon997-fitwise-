import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { JobSearchQuery, searchJobs } from "@/lib/job-search";
import { hasProfile } from "@/lib/matching";
import { sql } from "@/lib/db";
import { AppHeader } from "@/components/app/AppHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { SENIORITY_LABEL, TYPE_LABEL } from "@/lib/format";

export const metadata = { title: "Find jobs — Fitwise" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({ searchParams }: { searchParams: SP }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== ""));
  const user = await getCurrentUser();
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
        <h1 className="font-display text-4xl">Find jobs</h1>

        <form className="mt-6 rounded-2xl border border-line bg-paper-2/50 p-4" role="search">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <label className="sr-only" htmlFor="q">Keywords</label>
            <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Job title, skill or company" className={input} />
            <label className="sr-only" htmlFor="location">Location</label>
            <input id="location" name="location" defaultValue={params.location ?? ""} placeholder="City or country" className={input} />
            <button className="rounded-xl bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:bg-ink-2">Search</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <select name="type" defaultValue={params.type ?? ""} aria-label="Job type" className={`${input} sm:w-auto`}>
              <option value="">Any type</option>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="seniority" defaultValue={params.seniority ?? ""} aria-label="Level" className={`${input} sm:w-auto`}>
              <option value="">Any level</option>
              {Object.entries(SENIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="posted_within" defaultValue={params.posted_within?.toString() ?? ""} aria-label="Posted within" className={`${input} sm:w-auto`}>
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
            <select name="sort" defaultValue={params.sort} aria-label="Sort by" className={`${input} sm:w-auto`}>
              {personal && <option value="for_you">For you</option>}
              <option value="relevance">Most relevant</option>
              {personal && <option value="fit">Best fit</option>}
              <option value="recent">Newest</option>
              <option value="salary">Highest salary</option>
            </select>
            <label className="col-span-2 flex items-center gap-2 text-sm text-ink-2 sm:col-span-1 sm:ml-1">
              <input type="checkbox" name="remote" value="true" defaultChecked={params.remote === true} className="h-4 w-4 accent-[var(--color-accent)]" />
              Remote only
            </label>
          </div>
        </form>

        {!user && (
          <p className="mt-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-2">
            <Link href="/login?returnTo=/jobs" className="font-medium text-accent underline underline-offset-2">Sign in</Link> and add your resume to see your fit score on every job.
          </p>
        )}
        {user && !personal && (
          <p className="mt-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-2">
            <Link href="/profile" className="font-medium text-accent underline underline-offset-2">Add your skills</Link> to see your fit score on every job.
          </p>
        )}

        <p className="mt-6 text-sm text-muted" aria-live="polite">
          {result.total === 0 ? "No jobs found" : `${result.total} job${result.total === 1 ? "" : "s"}`}
          {params.sort === "for_you" && result.total > 0 && " · ranked for you by fit and what you've saved or passed on"}
        </p>

        {result.total === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line p-10 text-center text-ink-2">
            Try fewer filters or a broader search.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {result.jobs.map((j) => (
              <JobCard key={j.id} job={j} saved={saved.has(j.id)} signedIn={Boolean(user)} />
            ))}
          </div>
        )}

        {result.total_pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
            {params.page > 1 ? <Link href={pageHref(params.page - 1)} className="rounded-full border border-line px-4 py-2 hover:border-ink/40">← Previous</Link> : <span />}
            <span className="text-muted">Page {params.page} of {result.total_pages}</span>
            {params.page < result.total_pages ? <Link href={pageHref(params.page + 1)} className="rounded-full border border-line px-4 py-2 hover:border-ink/40">Next →</Link> : <span />}
          </nav>
        )}
      </main>
    </>
  );
}
