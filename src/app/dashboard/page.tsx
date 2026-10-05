import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasProfile, recommendJobs, skillGaps } from "@/lib/matching";
import { sql } from "@/lib/db";
import { AppHeader } from "@/components/app/AppHeader";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { JobCard } from "@/components/jobs/JobCard";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { STATUS_LABEL, skillLabel, timeAgo } from "@/lib/format";

export const metadata = { title: "Dashboard — Fitwise" };

const PIPELINE = ["applied", "interviewing", "offer"] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/dashboard");
  const first = user.name?.split(" ")[0];

  if (!hasProfile(user)) {
    return (
      <>
        <AppHeader user={user} active="/dashboard" />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-4xl sm:text-5xl">Welcome{first ? `, ${first}` : ""}.</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-2">
            Add your resume or a few skills and we&apos;ll score every job against them, then learn what you like as you go.
          </p>
          <ol className="mt-8 space-y-3 text-ink-2">
            <li><span className="font-medium text-ink">1.</span> Upload your resume, or type your skills.</li>
            <li><span className="font-medium text-ink">2.</span> Tell us the roles, places and salary you want.</li>
            <li><span className="font-medium text-ink">3.</span> Get matches ranked for you every week.</li>
          </ol>
          <Link href="/profile" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink-2">
            Set up my profile
          </Link>
        </main>
      </>
    );
  }

  const [matches, gaps, applications, saved] = await Promise.all([
    recommendJobs(user, { limit: 6, days: 14 }),
    skillGaps(user.id, 5),
    sql<{ id: string; status: string; updated_at: Date; job_id: string; title: string; company: string; score: number | null }>(
      `SELECT a.id, a.status, a.updated_at, j.id AS job_id, j.title, j.company, f.score
       FROM applications a JOIN jobs j ON j.id = a.job_id
       LEFT JOIN fit_scores f ON f.user_id = a.user_id AND f.job_id = a.job_id
       WHERE a.user_id = $1 ORDER BY a.updated_at DESC`,
      [user.id],
    ),
    sql<{ id: string; title: string; company: string; score: number | null; saved_at: Date }>(
      `SELECT j.id, j.title, j.company, f.score, s.created_at AS saved_at
       FROM saved_jobs s JOIN jobs j ON j.id = s.job_id
       LEFT JOIN fit_scores f ON f.user_id = s.user_id AND f.job_id = s.job_id
       WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT 8`,
      [user.id],
    ),
  ]);
  const savedIds = new Set(saved.map((s) => s.id));
  const count = (s: string) => applications.filter((a) => a.status === s).length;

  return (
    <>
      <AppHeader user={user} active="/dashboard" />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">Hi{first ? ` ${first}` : ""}.</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
            <FitScoreRing score={user.resume_score ?? 0} size={64} label="/ 100" />
            <div>
              <p className="text-sm font-medium">Profile strength</p>
              <Link href="/profile" className="text-xs text-accent underline underline-offset-2">Improve it</Link>
            </div>
          </div>
          {PIPELINE.map((s) => (
            <div key={s} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm text-muted">{STATUS_LABEL[s]}</p>
              <p className="mt-1 font-display text-4xl tabular-nums">{count(s)}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
          <section aria-labelledby="matches-heading" className="min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="matches-heading" className="font-display text-3xl">Your matches this week</h2>
              <Link href="/jobs?sort=for_you" className="shrink-0 text-sm text-ink-2 hover:text-ink">See all →</Link>
            </div>
            <p className="mt-1 text-sm text-muted">Ranked by your fit, your preferences, and the jobs you&apos;ve saved or passed on.</p>
            {matches.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center text-ink-2">
                No new matches in the last two weeks. <Link href="/jobs" className="text-accent underline underline-offset-2">Browse all jobs</Link>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {matches.map((m) => (
                  <JobCard key={m.job.id} job={{ ...m.job, fit: m.fit, personal: m.personal }} saved={savedIds.has(m.job.id)} signedIn />
                ))}
              </div>
            )}
          </section>

          <div className="space-y-8">
            <section aria-labelledby="tracker-heading" className="rounded-2xl border border-line bg-white p-5">
              <h2 id="tracker-heading" className="text-lg font-semibold">Applications</h2>
              {applications.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">Nothing yet. Open a job and use <strong>Apply with AI</strong>.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {applications.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/jobs/${a.job_id}`} className="block truncate text-sm font-medium hover:underline">{a.title}</Link>
                        <p className="truncate text-xs text-muted">{a.company} · {timeAgo(a.updated_at)}</p>
                      </div>
                      <StatusSelect id={a.id} status={a.status} label={a.title} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {gaps.length > 0 && (
              <section aria-labelledby="gaps-heading" className="rounded-2xl border border-line bg-white p-5">
                <h2 id="gaps-heading" className="text-lg font-semibold">Skills worth learning</h2>
                <p className="mt-1 text-xs text-muted">Missing from your near-miss matches (50–85 fit).</p>
                <ul className="mt-3 space-y-2">
                  {gaps.map((g) => (
                    <li key={g.skill} className="flex items-center justify-between text-sm">
                      <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">+ {skillLabel(g.skill)}</span>
                      <span className="text-xs text-muted">{g.jobs} job{g.jobs === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="saved-heading" className="rounded-2xl border border-line bg-white p-5">
              <h2 id="saved-heading" className="text-lg font-semibold">Saved jobs</h2>
              {saved.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">Tap ☆ Save on any job to keep it here.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/jobs/${s.id}`} className="block truncate text-sm font-medium hover:underline">{s.title}</Link>
                        <p className="truncate text-xs text-muted">{s.company}</p>
                      </div>
                      {s.score != null && <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">{s.score}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
