import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getJob, hasProfile } from "@/lib/matching";
import { UUID } from "@/lib/http";
import { can } from "@/lib/plans";
import { one } from "@/lib/db";
import { getReport, isStale } from "@/lib/ai-reports";
import { coachAccess, visiblePack, publicSession, type SessionRow } from "@/lib/interview";
import type { InterviewPack } from "@/lib/agents/interview";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { InterviewPrep } from "@/components/interview/InterviewPrep";
import { MockInterview } from "@/components/interview/MockInterview";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: (job: string) => `Interview coach: ${job} — JobFitwise`,
    back: "← Back to the job",
    title: "Interview coach",
    lead: "Prepare answers from your own experience, then practise with an interviewer for this job.",
    readiness: "Your interview readiness",
    practise: "Practice interview ↓",
    needCv: "Upload your CV first, so the questions and answers are built from your real experience.",
    cvCta: "Go to your profile",
  },
  sv: {
    meta: (job: string) => `Intervjucoach: ${job} — JobFitwise`,
    back: "← Tillbaka till jobbet",
    title: "Intervjucoach",
    lead: "Förbered svar utifrån din egen erfarenhet och öva sedan med en intervjuare för just det här jobbet.",
    readiness: "Din intervjuberedskap",
    practise: "Övningsintervju ↓",
    needCv: "Ladda upp ditt CV först, så att frågor och svar bygger på din riktiga erfarenhet.",
    cvCta: "Gå till din profil",
  },
});

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [job, locale] = await Promise.all([UUID.test(id) ? getJob(id) : null, getLocale()]);
  return { title: T[locale].meta(job?.title ?? ""), robots: { index: false } };
}

export default async function InterviewPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [job, user, locale] = await Promise.all([getJob(id), getCurrentUser(), getLocale()]);
  if (!job) notFound();
  if (!user) redirect(`/login?next=/jobs/${id}/interview`);
  const t = T[locale];
  const profile = hasProfile(user);

  const [{ access, pack }, stored, last] = profile
    ? await Promise.all([
        coachAccess(user, id),
        getReport<InterviewPack>(user.id, id, "interview"),
        one<SessionRow>("SELECT * FROM interview_sessions WHERE user_id = $1 AND job_id = $2 ORDER BY created_at DESC LIMIT 1", [user.id, id]),
      ])
    : [{ access: "locked" as const, pack: null }, null, null];
  const session = last ? publicSession(last) : null;

  return (
    <>
      <AppHeader user={user} active="/jobs" />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
        <Link href={`/jobs/${id}`} className="text-sm text-ink-2 hover:text-ink">{t.back}</Link>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">{t.title}</h1>
        <p className="mt-2 text-lg">{job.title} · <span className="text-ink-2">{job.company}</span></p>
        <p className="mt-1 text-ink-2">{t.lead}</p>

        {!profile ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-6">
            <p>{t.needCv}</p>
            <Link href="/profile" className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">{t.cvCta}</Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {session?.score != null && (
                <p className="rounded-full bg-accent-soft px-4 py-2 text-sm">
                  {t.readiness}: <strong className="tabular-nums">{session.score}%</strong>
                </p>
              )}
              <a href="#practice" className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-ink">{t.practise}</a>
            </div>
            <div className="mt-6 space-y-6">
              <InterviewPrep
                jobId={id}
                access={access}
                initial={pack ? visiblePack(pack, access) : null}
                stale={stored ? isStale(stored, user.profile_updated_at) : false}
              />
              <MockInterview jobId={id} allowed={can(user, "interview_coach")} initial={session} />
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
