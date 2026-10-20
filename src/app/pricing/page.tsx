import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { AI_DAILY_LIMITS } from "@/lib/site";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const L = AI_DAILY_LIMITS;

const T = defineT({
  en: {
    metaTitle: "Pricing — Fitwise",
    metaDescription: "Fitwise is free while in beta: fit scores, personalized matches, AI cover letters and an application tracker.",
    eyebrow: "Pricing",
    title: "Free while we're in beta.",
    intro: "Everything Fitwise does today is free. A paid plan with extras will come later, and the free plan will stay.",
    free: "Free",
    available: "Available now",
    price: "0 kr",
    noCard: "No credit card needed",
    freeItems: [
      "Unlimited job search with a fit score on every job",
      "Personalized “For you” ranking that learns what you like",
      "Resume reading: skills, experience and improvement tips",
      `${L.cover_letter} AI cover letters per day`,
      `${L.resume_parse} resume uploads per day`,
      "Application tracker and saved jobs",
      "Download or delete your data at any time",
    ],
    start: "Get started free",
    pro: "Pro",
    later: "Coming later",
    tba: "Price to be announced",
    plus: "Everything in Free, plus:",
    proItems: ["Higher daily AI limits", "Weekly email with your best new matches", "Interview preparation for each application", "Priority job imports for your target roles"],
    sooner: "Want something on this list sooner?",
    tellUs: "Tell us",
  },
  sv: {
    metaTitle: "Priser — Fitwise",
    metaDescription: "Fitwise är gratis under beta: matchningspoäng, personliga matchningar, AI-skrivna personliga brev och ansökningsöversikt.",
    eyebrow: "Priser",
    title: "Gratis under betan.",
    intro: "Allt Fitwise gör i dag är gratis. En betalversion med extra funktioner kommer senare, och gratisversionen finns kvar.",
    free: "Gratis",
    available: "Tillgänglig nu",
    price: "0 kr",
    noCard: "Inget kreditkort behövs",
    freeItems: [
      "Obegränsad jobbsökning med matchningspoäng på varje jobb",
      "Personlig ”För dig”-sortering som lär sig vad du gillar",
      "CV-analys: kompetenser, erfarenhet och förbättringstips",
      `${L.cover_letter} AI-skrivna personliga brev per dag`,
      `${L.resume_parse} CV-uppladdningar per dag`,
      "Ansökningsöversikt och sparade jobb",
      "Ladda ner eller radera din data när du vill",
    ],
    start: "Kom igång gratis",
    pro: "Pro",
    later: "Kommer senare",
    tba: "Pris meddelas senare",
    plus: "Allt i Gratis, plus:",
    proItems: ["Högre dagliga AI-gränser", "Veckomejl med dina bästa nya matchningar", "Intervjuförberedelse för varje ansökan", "Prioriterad jobbimport för dina målroller"],
    sooner: "Vill du ha något på listan tidigare?",
    tellUs: "Säg till",
  },
});

export async function generateMetadata() {
  const t = T[await getLocale()];
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function PricingPage() {
  const t = T[await getLocale()];
  return (
    <PageShell eyebrow={t.eyebrow} title={t.title} intro={t.intro}>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col rounded-2xl border-2 border-ink bg-white p-6 sm:p-8" aria-labelledby="free-plan">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="free-plan" className="text-xl font-semibold">{t.free}</h2>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{t.available}</span>
          </div>
          <p className="mt-4 font-display text-5xl">{t.price}</p>
          <p className="mt-1 text-sm text-muted">{t.noCard}</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {t.freeItems.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="text-accent" aria-hidden>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <ButtonLink href="/signup" className="mt-8">{t.start}</ButtonLink>
        </section>

        <section className="flex flex-col rounded-2xl border border-line bg-paper-2/50 p-6 sm:p-8" aria-labelledby="pro-plan">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="pro-plan" className="text-xl font-semibold">{t.pro}</h2>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">{t.later}</span>
          </div>
          <p className="mt-4 font-display text-5xl text-ink/40">—</p>
          <p className="mt-1 text-sm text-muted">{t.tba}</p>
          <p className="mt-6 text-sm text-ink-2">{t.plus}</p>
          <ul className="mt-3 flex-1 space-y-2.5 text-sm text-ink-2">
            {t.proItems.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="text-muted" aria-hidden>+</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            {t.sooner} <Link href="/faq#contact" className="text-accent underline underline-offset-2">{t.tellUs}</Link>.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
