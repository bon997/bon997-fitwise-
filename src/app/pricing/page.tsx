import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { PlanButton } from "@/components/billing/PlanButton";
import { getCurrentUser } from "@/lib/auth";
import { PRICE_SEK, currentPlan, paywallEnabled, type Plan } from "@/lib/plans";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

type Item = { text: string; soon?: boolean };

const T = defineT({
  en: {
    metaTitle: "Pricing — JobFitwise",
    metaDescription: "Basic is free. Pro adds AI job recommendations, ATS match analysis and email job alerts; Premium adds AI cover letters and career tools.",
    eyebrow: "Pricing",
    title: "Start free. Upgrade when it helps.",
    intro: "Search, save and apply for free. Pro finds and emails you the right jobs; Premium helps you win them.",
    beta: "Free during beta: every feature is unlocked for everyone right now. Plans start later, and we'll tell you before anything changes.",
    month: "/ month",
    vat: "incl. VAT · cancel any time",
    free: "Free forever",
    basicCta: "Get started free",
    upgrade: (p: string) => `Upgrade to ${p}`,
    yourPlan: "Your plan",
    included: "Included in your plan",
    popular: "Most popular",
    soon: "coming soon",
    plusPro: "Everything in Basic, plus:",
    plusPremium: "Everything in Pro, plus:",
    failed: "Couldn't open checkout. Try again in a moment.",
    manage: "Manage your subscription",
    questions: "Questions about plans?",
    ask: "Ask us",
    basic: [
      { text: "Create an account and upload your CV" },
      { text: "Search and browse all job listings" },
      { text: "A match score on every job" },
      { text: "Save up to 10 jobs" },
      { text: "Application tracker and Arbetsförmedlingen activity report" },
      { text: "Apply on the employer's site" },
    ] as Item[],
    pro: [
      { text: "AI resume analysis with improvement tips" },
      { text: "ATS match breakdown: skills, experience, education, location" },
      { text: "Personalised “For you” job recommendations" },
      { text: "Skill gap analysis and the skill that raises your score most" },
      { text: "Email job alerts: daily, weekly or monthly, by category, area and minimum match" },
      { text: "My priorities sorting and advanced filters" },
      { text: "Unlimited saved jobs" },
      { text: "AI career suggestions: roles you fit now" },
    ] as Item[],
    premium: [
      { text: "AI cover letter generator for each job (Swedish or English)" },
      { text: "Priority support" },
      { text: "Job-specific resume tailoring", soon: true },
      { text: "AI resume builder and keyword optimisation", soon: true },
      { text: "Interview questions, answers and mock interview practice", soon: true },
      { text: "LinkedIn profile optimisation", soon: true },
      { text: "Recruiter insights", soon: true },
    ] as Item[],
  },
  sv: {
    metaTitle: "Priser — JobFitwise",
    metaDescription: "Basic är gratis. Pro ger AI-jobbrekommendationer, ATS-matchningsanalys och jobbtips via mejl; Premium ger AI-skrivna personliga brev och karriärverktyg.",
    eyebrow: "Priser",
    title: "Börja gratis. Uppgradera när det hjälper.",
    intro: "Sök, spara och ansök gratis. Pro hittar och mejlar rätt jobb; Premium hjälper dig att få dem.",
    beta: "Gratis under betan: alla funktioner är upplåsta för alla just nu. Planerna startar senare, och vi säger till innan något ändras.",
    month: "/ mån",
    vat: "inkl. moms · avsluta när du vill",
    free: "Gratis för alltid",
    basicCta: "Kom igång gratis",
    upgrade: (p: string) => `Uppgradera till ${p}`,
    yourPlan: "Din plan",
    included: "Ingår i din plan",
    popular: "Populärast",
    soon: "kommer snart",
    plusPro: "Allt i Basic, plus:",
    plusPremium: "Allt i Pro, plus:",
    failed: "Kunde inte öppna betalningen. Försök igen om en stund.",
    manage: "Hantera din prenumeration",
    questions: "Frågor om planerna?",
    ask: "Fråga oss",
    basic: [
      { text: "Skapa konto och ladda upp ditt CV" },
      { text: "Sök och bläddra bland alla jobbannonser" },
      { text: "Matchningspoäng på varje jobb" },
      { text: "Spara upp till 10 jobb" },
      { text: "Ansökningsöversikt och aktivitetsrapport till Arbetsförmedlingen" },
      { text: "Sök jobbet hos arbetsgivaren" },
    ],
    pro: [
      { text: "AI-analys av ditt CV med förbättringstips" },
      { text: "ATS-matchning i detalj: kompetenser, erfarenhet, utbildning, ort" },
      { text: "Personliga jobbrekommendationer ”För dig”" },
      { text: "Kompetensgap och vilken kompetens som höjer poängen mest" },
      { text: "Jobbtips via mejl: dagligen, veckovis eller månadsvis, per kategori, område och lägsta matchning" },
      { text: "Mina prioriteringar och avancerade filter" },
      { text: "Obegränsat antal sparade jobb" },
      { text: "AI-karriärförslag: roller du passar för nu" },
    ],
    premium: [
      { text: "AI-skrivet personligt brev till varje jobb (svenska eller engelska)" },
      { text: "Prioriterad support" },
      { text: "CV anpassat till varje jobb", soon: true },
      { text: "AI-CV-byggare och nyckelordsoptimering", soon: true },
      { text: "Intervjufrågor, svar och övningsintervjuer", soon: true },
      { text: "Optimering av LinkedIn-profil", soon: true },
      { text: "Rekryterarinsikter", soon: true },
    ],
  },
});

export async function generateMetadata() {
  const t = T[await getLocale()];
  return { title: t.metaTitle, description: t.metaDescription };
}

function Features({ items, soon, mark = "✓" }: { items: Item[]; soon: string; mark?: string }) {
  return (
    <ul className="mt-3 flex-1 space-y-2.5 text-sm">
      {items.map((f) => (
        <li key={f.text} className={`flex gap-2.5 ${f.soon ? "text-muted" : ""}`}>
          <span className={f.soon ? "text-muted" : "text-accent"} aria-hidden>{f.soon ? "○" : mark}</span>
          <span>{f.text}{f.soon && <span className="ml-1.5 rounded-full bg-paper-2 px-1.5 py-0.5 text-[11px]">{soon}</span>}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PricingPage() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const t = T[locale];
  const live = paywallEnabled();
  const mine: Plan | null = user && live ? currentPlan(user) : null;
  const btn = "mt-8 block w-full rounded-full px-5 py-3 text-center text-sm font-medium";

  const paid = (plan: "pro" | "premium") => (
    <PlanButton
      plan={plan}
      signedIn={Boolean(user)}
      label={live ? t.upgrade(plan === "pro" ? "Pro" : "Premium") : t.basicCta}
      current={!live ? null : mine === plan ? t.yourPlan : mine === "premium" && plan === "pro" ? t.included : null}
      failedText={t.failed}
      className={`${btn} ${plan === "pro" ? "bg-accent text-paper hover:opacity-90" : "bg-ink text-paper hover:bg-ink-2"}`}
    />
  );

  return (
    <PageShell eyebrow={t.eyebrow} title={t.title} intro={t.intro}>
      {!live && <p className="mb-6 rounded-xl border border-accent/30 bg-accent-soft/60 px-4 py-3 text-sm">{t.beta}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col rounded-2xl border border-line bg-white p-6 sm:p-8" aria-labelledby="basic-plan">
          <h2 id="basic-plan" className="text-xl font-semibold">Basic</h2>
          <p className="mt-4 font-display text-5xl">0 kr</p>
          <p className="mt-1 text-sm text-muted">{t.free}</p>
          <Features items={t.basic} soon={t.soon} />
          {mine === "basic" ? <p className={`${btn} border border-line text-muted`}>{t.yourPlan}</p>
            : <Link href={user ? "/jobs" : "/signup"} className={`${btn} border border-ink/20 hover:border-ink/50`}>{t.basicCta}</Link>}
        </section>

        <section className="relative flex flex-col rounded-2xl border-2 border-accent bg-white p-6 sm:p-8" aria-labelledby="pro-plan">
          <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-paper">{t.popular}</span>
          <h2 id="pro-plan" className="text-xl font-semibold">Pro</h2>
          <p className="mt-4 font-display text-5xl">{PRICE_SEK.pro} kr<span className="text-lg text-muted"> {t.month}</span></p>
          <p className="mt-1 text-sm text-muted">{t.vat}</p>
          <p className="mt-6 text-sm text-ink-2">{t.plusPro}</p>
          <Features items={t.pro} soon={t.soon} />
          {paid("pro")}
        </section>

        <section className="flex flex-col rounded-2xl border border-line bg-white p-6 sm:p-8" aria-labelledby="premium-plan">
          <h2 id="premium-plan" className="text-xl font-semibold">Premium</h2>
          <p className="mt-4 font-display text-5xl">{PRICE_SEK.premium} kr<span className="text-lg text-muted"> {t.month}</span></p>
          <p className="mt-1 text-sm text-muted">{t.vat}</p>
          <p className="mt-6 text-sm text-ink-2">{t.plusPremium}</p>
          <Features items={t.premium} soon={t.soon} />
          {paid("premium")}
        </section>
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        {mine && mine !== "basic" && <><Link href="/account" className="text-accent underline underline-offset-2">{t.manage}</Link> · </>}
        {t.questions} <Link href="/faq#contact" className="text-accent underline underline-offset-2">{t.ask}</Link>.
      </p>
    </PageShell>
  );
}
