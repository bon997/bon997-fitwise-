import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getJob, fitForJob, hasProfile, personalProfile, toFitJob, toFitProfile } from "@/lib/matching";
import { personalize } from "@/lib/ai/personalize";
import { one } from "@/lib/db";
import { UUID } from "@/lib/http";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { FitDetails } from "@/components/jobs/FitDetails";
import { bestImprovement } from "@/lib/ai/fit-score";
import { maxPriority, scorePriorities } from "@/lib/priorities";
import { can } from "@/lib/plans";
import { LockedTeaser } from "@/components/billing/Upgrade";
import { JobActions } from "@/components/jobs/JobActions";
import { ApplyWithAI } from "@/components/jobs/ApplyWithAI";
import { labels, postedAgo, reasonText, skillLabel } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";
import { JsonLd } from "@/components/seo/JsonLd";

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
    howScore: "How is this calculated?",
    seeFit: "See why",
    prioTitle: "Your priorities",
    prioEdit: "Edit",
    prioPoints: "points",
    prioNone: "None of your priorities match this job.",
    addSkills: "Add your skills",
    addSkillsRest: "to see how well you match this job.",
    signIn: "Sign in",
    signInRest: "to see your fit score and apply with AI.",
    open: "Open application page ↗",
    letterTitle: "Write a cover letter with AI",
    letterShort: "Write a cover letter for this job",
    letterLocked: "Premium writes a personal cover letter for this job from your real experience, in Swedish or English, plus a tailored CV and interview prep (coming soon).",
    letterNeedsCv: "We write a personal letter for this job from your real experience. Add your CV or a few skills first — it takes about a minute.",
    letterNeedsAccount: "Create a free account and add your CV, and we'll write a personal letter for this job in Swedish or English.",
    letterCvCta: "Add my CV",
    letterSignupCta: "Create free account",
    fit: "fit",
    at: (title: string, company: string) => `${title} at ${company}`,
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
    howScore: "Hur räknas poängen?",
    seeFit: "Se varför",
    prioTitle: "Dina prioriteringar",
    prioEdit: "Ändra",
    prioPoints: "poäng",
    prioNone: "Inga av dina prioriteringar matchar det här jobbet.",
    addSkills: "Lägg till dina kompetenser",
    addSkillsRest: "för att se hur väl du matchar jobbet.",
    signIn: "Logga in",
    signInRest: "för att se din matchningspoäng och söka med AI.",
    open: "Öppna ansökningssidan ↗",
    letterTitle: "Skriv ett personligt brev med AI",
    letterShort: "Skriv ett personligt brev till jobbet",
    letterLocked: "Premium skriver ett personligt brev till jobbet utifrån din riktiga erfarenhet, på svenska eller engelska, plus anpassat CV och intervjuförberedelse (kommer snart).",
    letterNeedsCv: "Vi skriver ett personligt brev till det här jobbet utifrån din riktiga erfarenhet. Lägg till ditt CV eller några kompetenser först — det tar ungefär en minut.",
    letterNeedsAccount: "Skapa ett gratis konto och lägg till ditt CV, så skriver vi ett personligt brev till det här jobbet på svenska eller engelska.",
    letterCvCta: "Lägg till mitt CV",
    letterSignupCta: "Skapa gratis konto",
    fit: "match",
    at: (title: string, company: string) => `${title} hos ${company}`,
  },
});

type Props = { params: Promise<{ id: string }> };

// schema.org's names for our employment types.
const SCHEMA_TYPE: Record<string, string> = { full_time: "FULL_TIME", part_time: "PART_TIME", contract: "CONTRACTOR", internship: "INTERN" };

/** One line of plain text from a job ad, for search results and link previews. */
const snippet = (text: string, max = 155) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const [job, locale] = await Promise.all([getJob(id), getLocale()]);
  if (!job) return {};
  const title = `${T[locale].at(job.title, job.company)} — JobFitwise`;
  const description = snippet([job.location, job.salary_range, job.description || job.requirements].filter(Boolean).join(" · "));
  // A page's openGraph replaces the site-wide one, so the shared image is named again here.
  const images = ["/opengraph-image"];
  return {
    title,
    description,
    openGraph: { type: "website", siteName: "JobFitwise", title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

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
  const myRules = can(user, "advanced_filters") ? (user?.preferences?.priorities ?? []) : [];
  const prio = myRules.length ? scorePriorities(job, myRules) : null;
  const breakdown = fit?.breakdown ?? {};
  const partial = (breakdown.partial_skills as string[] | undefined) ?? [];
  // Re-scored in code with each missing skill added; free and instant.
  const semantic = (breakdown.details as { semantic?: number | null } | undefined)?.semantic;
  const fullFit = can(user, "match_breakdown");
  const improvement = fit && user && fullFit ? bestImprovement(toFitProfile(user), toFitJob(job), semantic == null ? null : semantic / 100) : null;
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
        {job.is_active && (
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "JobPosting",
              title: job.title,
              description: [job.requirements, job.description].filter(Boolean).join("\n\n") || job.title,
              datePosted: (job.posted_at ?? job.created_at).toISOString(),
              hiringOrganization: { "@type": "Organization", name: job.company },
              ...(job.location ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "SE" } } } : {}),
              ...(job.remote ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Sweden" } } : {}),
              ...(job.employment_type && SCHEMA_TYPE[job.employment_type] ? { employmentType: SCHEMA_TYPE[job.employment_type] } : {}),
              directApply: false,
            }}
          />
        )}
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
            {fit && typeof breakdown.readiness === "string" && (
              // Phones: the fit card sits below the ad, so give the verdict up top.
              <div className="mt-4 rounded-xl border border-line bg-white text-sm lg:hidden">
                <a href="#fit-heading" className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <strong className="tabular-nums">{fit.score}</strong> {t.fit} · {L.readiness[breakdown.readiness]}
                  </span>
                  <span className="text-accent">{t.seeFit} ↓</span>
                </a>
                <a href="#apply-heading" className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                  <span>{t.letterShort}</span>
                  <span className="text-accent">↓</span>
                </a>
              </div>
            )}

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
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="fit-heading" className="text-lg font-semibold">{t.yourFit}</h2>
                <a href="/faq#score" className="text-xs text-muted underline underline-offset-2 hover:text-ink">{t.howScore}</a>
              </div>
              {fit ? (
                <>
                  <FitDetails
                    score={fit.score}
                    breakdown={breakdown}
                    matched={fit.matched_skills}
                    partial={partial}
                    missing={fit.missing_skills}
                    improvement={improvement}
                    locale={locale}
                    full={fullFit}
                  />
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

            {myRules.length > 0 && (
              <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="prio-heading">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="prio-heading" className="text-lg font-semibold">{t.prioTitle}</h2>
                  <Link href="/profile#priorities-heading" className="text-xs text-muted underline underline-offset-2 hover:text-ink">{t.prioEdit}</Link>
                </div>
                <p className="mt-2 text-sm">
                  <strong className="text-2xl tabular-nums">{prio!.score}</strong>
                  <span className="text-muted"> / {maxPriority(myRules)} {t.prioPoints}</span>
                </p>
                {prio!.hits.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {prio!.hits.map((h) => (
                      <li key={h.label} className="flex justify-between gap-3">
                        <span className="text-ink-2">✓ {h.label}</span>
                        <span className="tabular-nums text-accent">+{h.points}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">{t.prioNone}</p>
                )}
              </section>
            )}

            {profile && !can(user, "cover_letters") ? (
              <section id="apply-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <LockedTeaser plan="premium" title={t.letterTitle} body={t.letterLocked} />
                {job.apply_url && (
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                    className="mt-4 block rounded-full bg-ink px-5 py-3 text-center text-sm font-medium text-paper hover:bg-ink-2">
                    {t.open}
                  </a>
                )}
              </section>
            ) : profile ? (
              <ApplyWithAI
                jobId={job.id}
                applyUrl={job.apply_url}
                existingLetter={application?.cover_letter ?? null}
                application={application ? { id: application.id, status: application.status } : null}
              />
            ) : (
              // Without a profile the letter can't be written, but the tool must still be visible:
              // hiding it left people unable to find cover letters at all.
              <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="letter-heading">
                <h2 id="letter-heading" className="text-lg font-semibold">{t.letterTitle}</h2>
                <p className="mt-1.5 text-sm text-ink-2">{user ? t.letterNeedsCv : t.letterNeedsAccount}</p>
                <Link
                  href={user ? "/profile" : `/signup?returnTo=/jobs/${job.id}`}
                  className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90"
                >
                  {user ? t.letterCvCta : t.letterSignupCta}
                </Link>
                {job.apply_url && (
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                    className="mt-5 block rounded-full bg-ink px-5 py-3 text-center text-sm font-medium text-paper hover:bg-ink-2">
                    {t.open}
                  </a>
                )}
              </section>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
