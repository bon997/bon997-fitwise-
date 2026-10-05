import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql, one } from "@/lib/db";
import { AppHeader } from "@/components/app/AppHeader";
import { ImportJobsForm } from "@/components/admin/ImportJobsForm";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Admin — Fitwise" };

type Totals = { users: number; with_profile: number; active_jobs: number; applications: number; jobs_7d: number };
type Run = { id: string; source: string; query: string; fetched: number; inserted: number; updated: number; error: string | null; started_at: Date };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/admin");
  if (user.role !== "admin") notFound(); // don't reveal the page exists

  const [totals, runs] = await Promise.all([
    one<Totals>(`SELECT
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM users WHERE jsonb_array_length(skills) > 0) AS with_profile,
      (SELECT count(*)::int FROM jobs WHERE is_active) AS active_jobs,
      (SELECT count(*)::int FROM applications) AS applications,
      (SELECT count(*)::int FROM jobs WHERE created_at > now() - interval '7 days') AS jobs_7d`),
    sql<Run>("SELECT * FROM ingest_runs ORDER BY started_at DESC LIMIT 15"),
  ]);

  const tiles = [
    ["Users", totals!.users],
    ["With a profile", totals!.with_profile],
    ["Active jobs", totals!.active_jobs],
    ["Jobs added (7 days)", totals!.jobs_7d],
    ["Applications", totals!.applications],
  ] as const;

  return (
    <>
      <AppHeader user={user} active="/admin" />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-display text-4xl">Admin</h1>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {tiles.map(([label, n]) => (
            <div key={label} className="rounded-2xl border border-line bg-white p-4">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 font-display text-3xl tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <ImportJobsForm
            sources={{
              serpapi: Boolean(process.env.SERPAPI_KEY),
              rapidapi: Boolean(process.env.RAPIDAPI_KEY),
              ai: Boolean(process.env.ANTHROPIC_API_KEY),
            }}
          />
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Recent imports</h2>
          {runs.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">None yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {runs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <span className="min-w-0 font-medium">{r.query}</span>
                  <span className={r.error ? "text-warn" : "text-muted"}>
                    {r.error ? `Failed: ${r.error.slice(0, 120)}` : `${r.fetched} found · ${r.inserted} new · ${r.updated} updated`} · {timeAgo(r.started_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
