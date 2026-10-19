import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { AI_DAILY_LIMITS, site } from "@/lib/site";

export const metadata = {
  title: "FAQ — Fitwise",
  description: "How Fitwise scores your fit, where jobs come from, what happens to your resume, and more.",
};

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "How is my fit score calculated?",
    a: (
      <>
        <p>
          Every job gets a score from 0 to 100 based on five things: your skills compared with the job&apos;s skills
          (45%), how closely your background matches the role (20%), years of experience (15%), seniority level (10%)
          and location (10%). Required skills count double, and a related skill (for example PostgreSQL when a job
          asks for SQL) earns half credit.
        </p>
        <p className="mt-3">
          Missing a required skill caps the score, because you can&apos;t be a near-perfect fit without the
          must-haves. Each job page shows the full breakdown, so you can see exactly why.
        </p>
      </>
    ),
  },
  {
    q: "What's the difference between “Best fit” and “For you”?",
    a: (
      <p>
        <strong>Best fit</strong> sorts purely by the fit score. <strong>For you</strong> also uses your preferences
        and the jobs you&apos;ve saved, applied to or passed on, and nudges the order by up to 15 points. It never
        changes the fit score itself, and every nudge is explained on the job card.
      </p>
    ),
  },
  {
    q: "Where do the jobs come from?",
    a: <p>From public job listings: Platsbanken, the Swedish Public Employment Service&apos;s job board, and Google Jobs search. Each job links to the employer&apos;s own application page.</p>,
  },
  {
    q: "Does Fitwise apply to jobs for me?",
    a: (
      <p>
        No. Fitwise drafts a cover letter from your real experience. You read it, edit it, and send the application
        yourself on the employer&apos;s site. Then mark it as applied to track it.
      </p>
    ),
  },
  {
    q: "Will the AI make things up in my cover letter?",
    a: (
      <p>
        It&apos;s instructed to use only the experience and skills in your resume and never invent results or numbers.
        AI can still make mistakes, so always read the letter before you send it.
      </p>
    ),
  },
  {
    q: "What happens to my resume?",
    a: (
      <p>
        It&apos;s used only to build your profile and match you with jobs. We never sell it or show it to employers.
        You can download everything we hold about you, or delete your account and all your data, from your Profile
        page at any time. Details are in our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    q: "Which file types can I upload?",
    a: <p>PDF, Word (.docx) and plain text, up to 5 MB. You can also skip the upload and type your skills by hand.</p>,
  },
  {
    q: "Is it really free? Are there limits?",
    a: (
      <p>
        Yes, it&apos;s free during the beta. To keep it that way, AI features have daily limits: {AI_DAILY_LIMITS.cover_letter}{" "}
        cover letters and {AI_DAILY_LIMITS.resume_parse} resume uploads per day. Searching jobs and fit scores are
        unlimited. See <Link href="/pricing">Pricing</Link>.
      </p>
    ),
  },
  {
    q: "Why is my score low for a job I'm sure I can do?",
    a: (
      <p>
        Usually because a skill is missing from your profile or named differently. Open your Profile, add the skills
        you actually have, and scores update straight away.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <PageShell eyebrow="FAQ" title="Questions, answered." narrow>
      <div className="divide-y divide-line border-y border-line">
        {faqs.map(({ q, a }) => (
          <details key={q} className="group py-5 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <span className="mt-1 shrink-0 text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="mt-3 leading-relaxed text-ink-2">{a}</div>
          </details>
        ))}
      </div>

      <section id="contact" className="mt-12 scroll-mt-24 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Still have a question?</h2>
        <p className="mt-2 text-ink-2">
          {site.contactEmail ? (
            <>
              Email us at <a href={`mailto:${site.contactEmail}`} className="text-accent underline underline-offset-2">{site.contactEmail}</a>.
              We read everything.
            </>
          ) : (
            <>We&apos;re setting up a support inbox. In the meantime, everything about your data can be managed from your Profile page.</>
          )}
        </p>
      </section>
    </PageShell>
  );
}
