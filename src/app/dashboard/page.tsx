import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasProfile, recommendJobs, skillGaps } from "@/lib/matching";
import { sql } from "@/lib/db";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { computeResumeScore } from "@/lib/ai/fit-score";
import { emailConfigured } from "@/lib/email";
import { JobCard } from "@/components/jobs/JobCard";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { labels, skillLabel, timeAgo } from "@/lib/format";
import { NextActionCard, NextActionSkeleton } from "@/components/dashboard/NextAction";
import { ProfileStrength } from "@/components/dashboard/ProfileStrength";
import { bestProfileStep, nextAction, profileChecklist } from "@/lib/next-action";
import type { Locale } from "@/i18n/config";
import type { UserRow } from "@/lib/data";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Dashboard — JobFitwise",
    welcome: (n?: string) => `Welcome${n ? `, ${n}` : ""}.`,
    intro: "Add your resume or a few skills and we'll score every job against them, then learn what you like as you go.",
    step1: "Upload your resume, or type your skills.",
    step2: "Tell us the roles, places and salary you want.",
    step3: "Get matches ranked for you every week.",
    setup: "Set up my profile",
    hi: (n?: string) => `Hi${n ? ` ${n}` : ""}.`,
    matches: "Your matches this week",
    seeAll: "See all →",
    rankedBy: "Ranked by your fit, your preferences, and the jobs you've saved or passed on.",
    noMatches: "No new matches in the last two weeks.",
    browse: "Browse all jobs",
    applications: "Applications",
    nothingYet: "Nothing yet. Open a job and use",
    applyAi: "Cover letter with AI",
    gaps: "Skills worth learning",
    gapsNote: "Missing from your near-miss matches (50–85 fit).",
    jobs: (n: number) => `${n} job${n === 1 ? "" : "s"}`,
    saved: "Saved jobs",
    savedEmpty: "Tap ☆ Save on any job to keep it here.",
    report: "Activity report for Arbetsförmedlingen →",
    confirm: "Confirm your email to get your best new matches by email each week.",
    confirmLink: "Set up job alerts →",
    invite: "Want your best new matches by email once a week?",
    inviteLink: "Turn on job alerts →",
  },
  sv: {
    meta: "Översikt — JobFitwise",
    welcome: (n?: string) => `Välkommen${n ? `, ${n}` : ""}.`,
    intro: "Lägg till ditt CV eller några kompetenser så matchar vi varje jobb mot dem och lär oss vad du gillar efter hand.",
    step1: "Ladda upp ditt CV eller skriv in dina kompetenser.",
    step2: "Berätta vilka roller, orter och vilken lön du vill ha.",
    step3: "Få matchningar rankade för dig varje vecka.",
    setup: "Skapa min profil",
    hi: (n?: string) => `Hej${n ? ` ${n}` : ""}.`,
    matches: "Veckans matchningar",
    seeAll: "Visa alla →",
    rankedBy: "Rankade efter din matchning, dina önskemål och de jobb du sparat eller valt bort.",
    noMatches: "Inga nya matchningar de senaste två veckorna.",
    browse: "Bläddra bland alla jobb",
    applications: "Ansökningar",
    nothingYet: "Inget än. Öppna ett jobb och använd",
    applyAi: "Personligt brev med AI",
    gaps: "Kompetenser värda att lära sig",
    gapsNote: "Saknas i dina nästan-matchningar (50–85 i matchning).",
    jobs: (n: number) => `${n} jobb`,
    saved: "Sparade jobb",
    savedEmpty: "Tryck på ☆ Spara på ett jobb för att samla det här.",
    report: "Aktivitetsrapport till Arbetsförmedlingen →",
    confirm: "Bekräfta din e-post så får du dina bästa nya matchningar med mejl varje vecka.",
    confirmLink: "Ställ in jobbtips →",
    invite: "Vill du få dina bästa nya matchningar med mejl en gång i veckan?",
    inviteLink: "Slå på jobbtips →",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
}

/**
 * Matches and skill gaps load once per request and stream in behind Suspense,
 * so the greeting, profile and tracker paint immediately. Gaps are read only
 * after recommendJobs has stored this visit's fit scores — reading them in
 * parallel missed brand-new scores, so a first visit showed no gaps.
 */
const loadMatches = cache(async (user: UserRow) => {
  const matches = await recommendJobs(user, { limit: 6, days: 14 });
  const gaps = await skillGaps(user.id, 5);
  return { matches, gaps };
});

async function ActionSection({ user, appliedIds, locale }: { user: UserRow; appliedIds: Set<string>; locale: Locale }) {
  const { matches, gaps } = await loadMatches(user);
  const strength = resumeStrength(user);
  const checklist = checklistFor(user);
  const action = nextAction({
    matches: matches.map((m) => ({
      id: m.job.id, title: m.job.title, company: m.job.company, score: m.fit.score,
      ready: m.fit.breakdown.readiness === "ready", applied: appliedIds.has(m.job.id),
    })),
    strength, checklist, gaps,
  });
  return <NextActionCard action={action} profileStep={bestProfileStep(checklist)} topGap={gaps[0] ?? null} locale={locale} />;
}

async function MatchesList({ user, savedIds, locale }: { user: UserRow; savedIds: Set<string>; locale: Locale }) {
  const t = T[locale];
  const { matches } = await loadMatches(user);
  if (matches.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center text-ink-2">
        {t.noMatches} <Link href="/jobs" className="text-accent underline underline-offset-2">{t.browse}</Link>
      </div>
    );
  }
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      {matches.map((m) => (
        <JobCard key={m.job.id} job={{ ...m.job, fit: m.fit, personal: m.personal }} saved={savedIds.has(m.job.id)} signedIn />
      ))}
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div aria-hidden className="mt-5 grid gap-4 xl:grid-cols-2">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-[284px] animate-pulse rounded-2xl border border-line bg-white/60" />)}
    </div>
  );
}

async function GapsSection({ user, locale }: { user: UserRow; locale: Locale }) {
  const t = T[locale];
  const { gaps } = await loadMatches(user);
  if (gaps.length === 0) return null;
  return (
    <section aria-labelledby="gaps-heading" className="rounded-2xl border border-line bg-white p-5">
      <h2 id="gaps-heading" className="text-lg font-semibold">{t.gaps}</h2>
      <p className="mt-1 text-xs text-muted">{t.gapsNote}</p>
      <ul className="mt-3 space-y-2">
        {gaps.map((g) => (
          <li key={g.skill} className="flex items-center justify-between text-sm">
            <Link href={`/jobs?q=${encodeURIComponent(g.skill)}`} className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn hover:underline">+ {skillLabel(g.skill)}</Link>
            <span className="text-xs text-muted">{t.jobs(g.jobs)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const resumeStrength = (user: UserRow) =>
  user.resume_score ?? computeResumeScore({ skills: user.skills, experience: user.experience, yearsExperience: user.years_experience == null ? null : Number(user.years_experience) });

const checklistFor = (user: UserRow) =>
  profileChecklist({
    skills: user.skills,
    experience: user.experience,
    yearsExperience: user.years_experience == null ? null : Number(user.years_experience),
    locations: user.preferences?.locations ?? [],
    remoteOnly: Boolean(user.preferences?.remote_only),
    education: user.education ?? [],
  });

const PIPELINE = ["applied", "interviewing", "offer"] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/dashboard");
  const first = user.name?.split(" ")[0];
  const locale = await getLocale();
  const t = T[locale];

  // New users (email or Google) answer the onboarding questions first, once.
  if (!hasProfile(user) && !user.preferences?.onboarded) redirect("/onboarding");

  if (!hasProfile(user)) {
    return (
      <>
        <AppHeader user={user} active="/dashboard" />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-4xl sm:text-5xl">{t.welcome(first)}</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-2">
            {t.intro}
          </p>
          <ol className="mt-8 space-y-3 text-ink-2">
            <li><span className="font-medium text-ink">1.</span> {t.step1}</li>
            <li><span className="font-medium text-ink">2.</span> {t.step2}</li>
            <li><span className="font-medium text-ink">3.</span> {t.step3}</li>
          </ol>
          <Link href="/profile" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink-2">
            {t.setup}
          </Link>
        </main>
      </>
    );
  }

  const [applications, saved] = await Promise.all([
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
  const appliedIds = new Set(applications.filter((a) => a.status !== "draft").map((a) => a.job_id));
  const savedIds = new Set(saved.map((s) => s.id));
  const count = (s: string) => applications.filter((a) => a.status === s).length;

  return (
    <>
      <AppHeader user={user} active="/dashboard" />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">{t.hi(first)}</h1>
        {emailConfigured() && (user.job_alerts ? !user.email_verified_at : !user.job_alert_checked_at) && (
          // Alerts on but address unconfirmed, or an account from before alerts existed that hasn't chosen yet.
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-2">
            {user.job_alerts ? t.confirm : t.invite}
            <Link href="/profile#alerts-heading" className="font-medium text-accent hover:underline">{user.job_alerts ? t.confirmLink : t.inviteLink}</Link>
          </p>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-12">
            <Suspense fallback={<NextActionSkeleton />}>
              <ActionSection user={user} appliedIds={appliedIds} locale={locale} />
            </Suspense>

            <section aria-labelledby="matches-heading" className="min-w-0">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="matches-heading" className="font-display text-3xl">{t.matches}</h2>
                <Link href="/jobs?sort=for_you" className="shrink-0 text-sm text-ink-2 hover:text-ink">{t.seeAll}</Link>
              </div>
              <p className="mt-1 text-sm text-muted">{t.rankedBy}</p>
              <Suspense fallback={<MatchesSkeleton />}>
                <MatchesList user={user} savedIds={savedIds} locale={locale} />
              </Suspense>
            </section>
          </div>

          <div className="space-y-8">
            <ProfileStrength strength={resumeStrength(user)} checklist={checklistFor(user)} locale={locale} />

            <section aria-labelledby="tracker-heading" className="rounded-2xl border border-line bg-white p-5">
              <h2 id="tracker-heading" className="text-lg font-semibold">{t.applications}</h2>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {PIPELINE.map((s) => (
                  <div key={s} className="rounded-xl bg-paper px-2 py-2">
                    <dt className="truncate text-xs text-muted">{labels(locale).status[s]}</dt>
                    <dd className="font-display text-2xl tabular-nums">{count(s)}</dd>
                  </div>
                ))}
              </dl>
              {applications.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">{t.nothingYet} <strong>{t.applyAi}</strong>.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {applications.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/jobs/${a.job_id}`} className="block truncate text-sm font-medium hover:underline">{a.title}</Link>
                        <p className="truncate text-xs text-muted">{a.company} · {timeAgo(a.updated_at, locale)}</p>
                      </div>
                      <StatusSelect id={a.id} status={a.status} label={a.title} />
                    </li>
                  ))}
                </ul>
              )}
              {applications.some((a) => a.status !== "draft") && (
                <Link href="/activity-report" className="mt-3 inline-block border-t border-line pt-3 text-sm font-medium text-accent hover:underline">
                  {t.report}
                </Link>
              )}
            </section>

            <Suspense fallback={null}>
              <GapsSection user={user} locale={locale} />
            </Suspense>

            <section aria-labelledby="saved-heading" className="rounded-2xl border border-line bg-white p-5">
              <h2 id="saved-heading" className="text-lg font-semibold">{t.saved}</h2>
              {saved.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">{t.savedEmpty}</p>
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
      <Footer />
    </>
  );
}
