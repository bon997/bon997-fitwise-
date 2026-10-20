import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getJob, fitForJob, hasProfile, personalProfile } from "@/lib/matching";
import { personalize } from "@/lib/ai/personalize";
import { one } from "@/lib/db";
import { UUID } from "@/lib/http";
import { AppHeader } from "@/components/app/AppHeader";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { SkillChips } from "@/components/jobs/SkillChips";
import { JobActions } from "@/components/jobs/JobActions";
import { ApplyWithAI } from "@/components/jobs/ApplyWithAI";
import { labels, postedAgo, reasonText, skillLabel } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    years: (n: number) => `${n}+ years`,
    all: "← All jobs",
    youDo: "What you'll do",
    skills: "Skills",
    required: "Required:",
    nice: "Nice to have:",
    about: "About the role",
    yourFit: "Your fit",
    addSkills: "Add your skills",
    addSkillsRest: "to see how well you match this job.",
    signIn: "Sign in",
    signInRest: "to see your fit score and apply with AI.",
    open: "Open application page ↗",
    fit: "fit",
  },
  sv: {
    years: (n: number) => `${n}+ års erfarenhet`,
    all: "← Alla jobb",
    youDo: "Det här kommer du att göra",
    skills: "Kompetenser",
    required: "Krav:",
    nice: "Meriterande:",
    about: "Om rollen",
    yourFit: "Din matchning",
    addSkills: "Lägg till dina kompetenser",
    addSkillsRest: "för att se hur väl du matchar jobbet.",
    signIn: "Logga in",
    signInRest: "för att se din matchningspoäng och söka med AI.",
    open: "Öppna ansökningssidan ↗",
    fit: "match",
  },
});

type Props = { params: Promise<{ id: string }> };

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [job, user, locale] = await Promise.all([getJob(id), getCurrentUser(), getLocale()]);
  const t = T[locale];
  const L = labels(locale);
  if (!job) notFound();

  const profile = Boolean(user && hasProfile(user));
  const [fit, saved, application, personal] = await Promise.all([
    profile ? fitForJob(user!, job) : null,
    user ? one("SELECT 1 FROM saved_jobs WHERE user_id = $1 AND job_id = $2", [user.id, id]) : null,
    user
      ? one<{ id: string; status: string; cover_letter: string | null }>(
          "SELECT id, status, cover_letter FROM applications WHERE user_id = $1 AND job_id = $2", [user.id, id])
      : null,
    profile ? personalProfile(user!) : null,
  ]);
  const why = personal ? personalize(job, personal.profile) : null;
  const breakdown = (fit?.breakdown ?? {}) as Record<string, number | null | string[]>;
  const partial = (breakdown.partial_skills as string[] | undefined) ?? [];
  const required = job.skills.filter((s) => s.required);
  const niceToHave = job.skills.filter((s) => !s.required);

  const facts = [
    job.location,
    job.remote && !/remote|distans/i.test(job.location ?? "") ? L.remote : null,
    job.employment_type ? L.type[job.employment_type] : null,
    job.seniority ? L.seniority[job.seniority] : null,
    job.min_years ? t.years(Number(job.min_years)) : null,
  ].filter(Boolean);

  return (
    <>
      <AppHeader user={user} active="/jobs" />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <Link href="/jobs" className="text-sm text-muted hover:text-ink">{t.all}</Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wider text-muted">{job.company}</p>
            <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{job.title}</h1>
            <p className="mt-3 text-ink-2">{facts.join(" · ")}</p>
            <p className="mt-1 text-sm text-muted">
              {[job.salary_range, postedAgo(job.posted_at, locale)].filter(Boolean).join(" · ")}
            </p>
            {user && <div className="mt-4"><JobActions jobId={job.id} saved={Boolean(saved)} /></div>}

            {job.responsibilities.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">{t.youDo}</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-2 marker:text-accent">
                  {job.responsibilities.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </section>
            )}

            {job.skills.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">{t.skills}</h2>
                {required.length > 0 && (
                  <p className="mt-3 text-sm text-ink-2"><span className="font-medium text-ink">{t.required}</span> {required.map((s) => skillLabel(s.name)).join(", ")}</p>
                )}
                {niceToHave.length > 0 && (
                  <p className="mt-1.5 text-sm text-ink-2"><span className="font-medium text-ink">{t.nice}</span> {niceToHave.map((s) => skillLabel(s.name)).join(", ")}</p>
                )}
              </section>
            )}

            {(job.requirements || job.description) && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">{t.about}</h2>
                {job.requirements && <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-2">{job.requirements}</p>}
                {job.description && <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-2">{job.description}</p>}
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="fit-heading">
              <h2 id="fit-heading" className="text-lg font-semibold">{t.yourFit}</h2>
              {fit ? (
                <>
                  <div className="mt-4 flex items-center gap-5">
                    <FitScoreRing score={fit.score} size={88} stroke={8} label={t.fit} />
                    <dl className="flex-1 space-y-1.5">
                      {Object.entries(L.breakdown).map(([k, label]) => {
                        const v = breakdown[k];
                        if (typeof v !== "number") return null;
                        return (
                          <div key={k} className="grid grid-cols-[84px_1fr_28px] items-center gap-2 text-xs">
                            <dt className="text-muted">{label}</dt>
                            <dd className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                              <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
                            </dd>
                            <dd className="text-right tabular-nums text-ink-2">{v}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                  <div className="mt-5">
                    <SkillChips matched={fit.matched_skills} partial={partial} missing={fit.missing_skills} />
                  </div>
                  {why && why.reasons.length > 0 && (
                    <ul className="mt-4 space-y-1 border-t border-line pt-4 text-xs">
                      {why.reasons.map((r) => (
                        <li key={r.text} className={r.positive ? "text-accent" : "text-warn"}>{r.positive ? "↑ " : "↓ "}{reasonText(r, locale)}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-2">
                  {user ? (
                    <><Link href="/profile" className="font-medium text-accent underline underline-offset-2">{t.addSkills}</Link> {t.addSkillsRest}</>
                  ) : (
                    <><Link href={`/login?returnTo=/jobs/${job.id}`} className="font-medium text-accent underline underline-offset-2">{t.signIn}</Link> {t.signInRest}</>
                  )}
                </p>
              )}
            </section>

            {profile ? (
              <ApplyWithAI
                jobId={job.id}
                applyUrl={job.apply_url}
                existingLetter={application?.cover_letter ?? null}
                application={application ? { id: application.id, status: application.status } : null}
              />
            ) : job.apply_url ? (
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                className="block rounded-full bg-ink px-5 py-3 text-center text-sm font-medium text-paper hover:bg-ink-2">
                {t.open}
              </a>
            ) : null}
          </aside>
        </div>
      </main>
    </>
  );
}
