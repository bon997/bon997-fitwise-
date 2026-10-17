import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { AI_DAILY_LIMITS } from "@/lib/site";

export const metadata = {
  title: "Pricing — Fitwise",
  description: "Fitwise is free while in beta: fit scores, personalized matches, AI cover letters and an application tracker.",
};

const free = [
  "Unlimited job search with a fit score on every job",
  "Personalized “For you” ranking that learns what you like",
  "Resume reading: skills, experience and improvement tips",
  `${AI_DAILY_LIMITS.cover_letter} AI cover letters per day`,
  `${AI_DAILY_LIMITS.resume_parse} resume uploads per day`,
  "Application tracker and saved jobs",
  "Download or delete your data at any time",
];

const pro = [
  "Higher daily AI limits",
  "Weekly email with your best new matches",
  "Interview preparation for each application",
  "Priority job imports for your target roles",
];

export default function PricingPage() {
  return (
    <PageShell
      eyebrow="Pricing"
      title="Free while we're in beta."
      intro="Everything Fitwise does today is free. A paid plan with extras will come later, and the free plan will stay."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col rounded-2xl border-2 border-ink bg-white p-6 sm:p-8" aria-labelledby="free-plan">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="free-plan" className="text-xl font-semibold">Free</h2>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">Available now</span>
          </div>
          <p className="mt-4 font-display text-5xl">0 kr</p>
          <p className="mt-1 text-sm text-muted">No credit card needed</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {free.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="text-accent" aria-hidden>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <ButtonLink href="/signup" className="mt-8">Get started free</ButtonLink>
        </section>

        <section className="flex flex-col rounded-2xl border border-line bg-paper-2/50 p-6 sm:p-8" aria-labelledby="pro-plan">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="pro-plan" className="text-xl font-semibold">Pro</h2>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">Coming later</span>
          </div>
          <p className="mt-4 font-display text-5xl text-ink/40">—</p>
          <p className="mt-1 text-sm text-muted">Price to be announced</p>
          <p className="mt-6 text-sm text-ink-2">Everything in Free, plus:</p>
          <ul className="mt-3 flex-1 space-y-2.5 text-sm text-ink-2">
            {pro.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="text-muted" aria-hidden>+</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            Want something on this list sooner? <Link href="/faq#contact" className="text-accent underline underline-offset-2">Tell us</Link>.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
