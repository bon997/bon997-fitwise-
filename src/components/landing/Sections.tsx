import Link from "next/link";
import { MARKETING, testimonials } from "@/lib/marketing-data";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    howTitle: "From resume to a tailored application in three steps.",
    testimonialsTitle: "Fewer applications. Better ones.",
    principlesTitle: "Built on three promises.",
    ctaTitle: "Your next role is already listed.",
    ctaEm: "Find it faster.",
    cta: "Get your first matches",
    jobs: "Jobs",
    pricing: "Pricing",
    faq: "FAQ",
    privacy: "Privacy",
    terms: "Terms",
  },
  sv: {
    howTitle: "Från CV till en anpassad ansökan i tre steg.",
    testimonialsTitle: "Färre ansökningar. Bättre ansökningar.",
    principlesTitle: "Byggt på tre löften.",
    ctaTitle: "Ditt nästa jobb finns redan utannonserat.",
    ctaEm: "Hitta det snabbare.",
    cta: "Få dina första matchningar",
    jobs: "Jobb",
    pricing: "Priser",
    faq: "Vanliga frågor",
    privacy: "Integritet",
    terms: "Villkor",
  },
});

export async function HowItWorks() {
  const locale = await getLocale();
  const t = T[locale];
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <h2 className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">{t.howTitle}</h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3">
        {MARKETING[locale].steps.map((s) => (
          <li key={s.n} className="border-t border-ink pt-5">
            <span className="text-xs font-semibold tabular-nums text-accent">{s.n}</span>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function Testimonials() {
  // Until there are real quotes, show what we promise instead of inventing praise.
  if (testimonials.length === 0) return <Principles />;
  const t = T[await getLocale()];
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl sm:text-5xl">{t.testimonialsTitle}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((q) => (
            <figure key={q.name} className="flex flex-col justify-between rounded-2xl border border-paper/15 p-6">
              <blockquote className="leading-relaxed text-paper/85">“{q.quote}”</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-medium">{q.name}</span>
                <span className="block text-paper/55">{q.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

async function Principles() {
  const locale = await getLocale();
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl sm:text-5xl">{T[locale].principlesTitle}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {MARKETING[locale].principles.map((p) => (
            <div key={p.title} className="rounded-2xl border border-paper/15 p-6">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-3 leading-relaxed text-paper/75">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function FinalCta() {
  const t = T[await getLocale()];
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight sm:text-6xl">
        {t.ctaTitle} <em className="text-accent">{t.ctaEm}</em>
      </h2>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/signup">{t.cta}</ButtonLink>
      </div>
    </section>
  );
}

export async function Footer() {
  const t = T[await getLocale()];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Fitwise</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li><Link href="/jobs" className="hover:text-ink">{t.jobs}</Link></li>
          <li><Link href="/pricing" className="hover:text-ink">{t.pricing}</Link></li>
          <li><Link href="/faq" className="hover:text-ink">{t.faq}</Link></li>
          <li><Link href="/privacy" className="hover:text-ink">{t.privacy}</Link></li>
          <li><Link href="/terms" className="hover:text-ink">{t.terms}</Link></li>
        </ul>
      </div>
    </footer>
  );
}
