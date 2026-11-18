import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { ApplicationCard, MarkAppliedButton, type CardApplication } from "@/components/applications/ApplicationCard";
import { trackerStats } from "@/lib/tracker-stats";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "My applications — JobFitwise",
    title: "My applications",
    intro: "Every job you've saved or applied to, with dates, notes and what happens next.",
    sent: "Applications sent",
    week: (n: number) => `${n} this week`,
    interviewRate: "Interview rate",
    successRate: "Offer rate",
    active: "Active",
    waiting: (n: number) => `${n} waiting for a reply`,
    none: "—",
    tabs: { all: "All", active: "Active", interview: "Interview", offer: "Offer", closed: "Closed", draft: "Not sent" },
    savedTitle: "Saved, not applied yet",
    emptyTitle: "Nothing here yet",
    empty: "Find a job you like, then use Save or Cover letter with AI. It shows up here, and you can mark it as applied.",
    findJobs: "Find jobs",
    emptyTab: "No applications in this list.",
    report: "Activity report for Arbetsförmedlingen →",
  },
  sv: {
    meta: "Mina ansökningar — JobFitwise",
    title: "Mina ansökningar",
    intro: "Alla jobb du har sparat eller sökt, med datum, anteckningar och vad som händer härnäst.",
    sent: "Skickade ansökningar",
    week: (n: number) => `${n} denna vecka`,
    interviewRate: "Andel intervjuer",
    successRate: "Andel erbjudanden",
    active: "Pågående",
    waiting: (n: number) => `${n} väntar på svar`,
    none: "—",
    tabs: { all: "Alla", active: "Pågående", interview: "Intervju", offer: "Erbjudande", closed: "Avslutade", draft: "Ej skickade" },
    savedTitle: "Sparade, inte sökta än",
    emptyTitle: "Inget här än",
    empty: "Hitta ett jobb du gillar och tryck Spara eller Personligt brev med AI. Det hamnar här och du kan markera det som sökt.",
    findJobs: "Hitta jobb",
    emptyTab: "Inga ansökningar i den här listan.",
    report: "Aktivitetsrapport för Arbetsförmedlingen →",
  },
});

export async function generateMetadata(): Promise<Metadata> {
  return { title: T[await getLocale()].meta, robots: { index: false } };
}

const TABS = {
  all: () => true,
  active: (s: string) => s === "applied" || s === "interviewing",
  interview: (s: string) => s === "interviewing",
  offer: (s: string) => s === "offer",
  closed: (s: string) => s === "rejected" || s === "withdrawn",
  draft: (s: string) => s === "draft",
} as const;
type Tab = keyof typeof TABS;

type Row = Omit<CardApplication, "events" | "applied_at" | "created_at" | "interview_at"> & {
  applied_at: Date | null;
  created_at: Date;
  interview_at: Date | null;
  reached_interview: boolean;
  events: { status: string; at: string }[];
};

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/applications");
  const locale = await getLocale();
  const t = T[locale];
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab && rawTab in TABS ? (rawTab as Tab) : "all";

  const [rows, saved] = await Promise.all([
    sql<Row>(
      `SELECT a.id, a.status, a.notes, a.next_step, a.applied_at, a.created_at, a.interview_at,
              json_build_object('id', j.id, 'title', j.title, 'company', j.company, 'location', j.location) AS job,
              f.score AS fit_score,
              coalesce((SELECT json_agg(json_build_object('status', e.status, 'at', e.at) ORDER BY e.at)
                        FROM application_events e WHERE e.application_id = a.id), '[]'::json) AS events,
              EXISTS (SELECT 1 FROM application_events e
                      WHERE e.application_id = a.id AND e.status IN ('interviewing', 'offer')) AS reached_interview
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN fit_scores f ON f.user_id = a.user_id AND f.job_id = a.job_id
       WHERE a.user_id = $1
       ORDER BY a.interview_at IS NULL, a.interview_at, a.updated_at DESC`,
      [user.id],
    ),
    sql<{ id: string; title: string; company: string; score: number | null }>(
      `SELECT j.id, j.title, j.company, f.score
       FROM saved_jobs s JOIN jobs j ON j.id = s.job_id
       LEFT JOIN fit_scores f ON f.user_id = s.user_id AND f.job_id = s.job_id
       WHERE s.user_id = $1
         AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.user_id = s.user_id AND a.job_id = s.job_id)
       ORDER BY s.created_at DESC`,
      [user.id],
    ),
  ]);

  const stats = trackerStats(rows);
  const shown = rows.filter((r) => TABS[tab](r.status));
  const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
  const pct = (n: number | null) => (n == null ? t.none : `${n}%`);

  const tiles = [
    { label: t.sent, value: String(stats.sent), sub: t.week(stats.this_week) },
    { label: t.interviewRate, value: pct(stats.interview_rate), sub: `${stats.interviews} / ${stats.sent}` },
    { label: t.successRate, value: pct(stats.success_rate), sub: `${stats.offers} / ${stats.sent}` },
    { label: t.active, value: String(stats.active), sub: t.waiting(stats.waiting) },
  ];

  return (
    <>
      <AppHeader user={user} active="/applications" />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">{t.title}</h1>
        <p className="mt-2 text-ink-2">{t.intro}</p>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((x) => (
            <div key={x.label} className="rounded-2xl border border-line bg-white p-4">
              <dt className="text-xs text-muted">{x.label}</dt>
              <dd>
                <span className="mt-1 block font-display text-3xl tabular-nums">{x.value}</span>
                <span className="block text-xs text-ink-2">{x.sub}</span>
              </dd>
            </div>
          ))}
        </dl>

        {rows.length === 0 && saved.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line bg-white p-8 text-center">
            <h2 className="text-lg font-semibold">{t.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{t.empty}</p>
            <Link href="/jobs" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2">{t.findJobs}</Link>
          </div>
        ) : (
          <>
            {saved.length > 0 && (
              <section aria-labelledby="saved-heading" className="mt-10">
                <h2 id="saved-heading" className="text-lg font-semibold">{t.savedTitle}</h2>
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white px-4">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/jobs/${s.id}`} className="block truncate text-sm font-medium hover:underline">{s.title}</Link>
                        <p className="truncate text-xs text-muted">{s.company}{s.score != null ? ` · ${s.score}` : ""}</p>
                      </div>
                      <MarkAppliedButton jobId={s.id} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {rows.length > 0 && (
              <section aria-label={t.title} className="mt-10">
                <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label={t.title}>
                  {(Object.keys(TABS) as Tab[]).map((k) => {
                    const n = rows.filter((r) => TABS[k](r.status)).length;
                    return (
                      <Link
                        key={k}
                        href={k === "all" ? "/applications" : `/applications?tab=${k}`}
                        aria-current={tab === k ? "page" : undefined}
                        className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${tab === k ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink-2 hover:border-ink"}`}
                      >
                        {t.tabs[k]} <span className="tabular-nums opacity-70">{n}</span>
                      </Link>
                    );
                  })}
                </nav>
                {shown.length === 0 ? (
                  <p className="mt-6 text-sm text-ink-2">{t.emptyTab}</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {shown.map((r) => (
                      <ApplicationCard
                        key={r.id}
                        app={{ ...r, applied_at: iso(r.applied_at), created_at: iso(r.created_at)!, interview_at: iso(r.interview_at) }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {stats.sent > 0 && (
              <Link href="/activity-report" className="mt-8 inline-block text-sm font-medium text-accent hover:underline">{t.report}</Link>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
