import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { PlanButton } from "@/components/billing/PlanButton";
import { getCurrentUser } from "@/lib/auth";
import { currentPlan, paywallEnabled, periodDeal, offeredPeriods, trialDaysLeft, TRIAL_DAYS, type Plan, type Period } from "@/lib/plans";
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
    per: { month: "/ month", quarter: "/ 3 months", year: "/ year" } as Record<Period, string>,
    periodName: { month: "Monthly", quarter: "3 months", year: "12 months" } as Record<Period, string>,
    saveUpTo: (n: number) => `save up to ${n}%`,
    perMonth: (n: number, save: number) => `${n} kr per month · save ${save}%`,
    vat: "incl. VAT · cancel any time",
    billed: { month: "incl. VAT · cancel any time", quarter: "incl. VAT · billed every 3 months · cancel any time", year: "incl. VAT · billed once a year · cancel any time" } as Record<Period, string>,
    trial: (d: number) => `Try Pro free for ${d} days when you upload your CV. No card needed.`,
    trialLeft: (d: number) => `You're on the free Pro trial: ${d === 1 ? "1 day" : `${d} days`} left.`,
    periodLabel: "Billing period",
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
      { text: "Interview coach: questions, answers from your CV, STAR examples and mock interviews" },
      { text: "Career coach: role path, skill plan, certifications and salary steps" },
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
    per: { month: "/ mån", quarter: "/ 3 mån", year: "/ år" } as Record<Period, string>,
    periodName: { month: "Månadsvis", quarter: "3 månader", year: "12 månader" } as Record<Period, string>,
    saveUpTo: (n: number) => `spara upp till ${n} %`,
    perMonth: (n: number, save: number) => `${n} kr per månad · spara ${save} %`,
    billed: { month: "inkl. moms · avsluta när du vill", quarter: "inkl. moms · dras var tredje månad · avsluta när du vill", year: "inkl. moms · dras en gång per år · avsluta när du vill" } as Record<Period, string>,
    trial: (d: number) => `Prova Pro gratis i ${d} dagar när du laddar upp ditt CV. Inget kort behövs.`,
    trialLeft: (d: number) => `Du har gratis Pro-provperiod: ${d === 1 ? "1 dag" : `${d} dagar`} kvar.`,
    periodLabel: "Betalperiod",
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
      { text: "Intervjucoach: frågor, svar utifrån ditt CV, STAR-exempel och övningsintervjuer" },
      { text: "Karriärcoach: karriärväg, kompetensplan, certifieringar och lönesteg" },
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

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const [locale, user, sp] = await Promise.all([getLocale(), getCurrentUser(), searchParams]);
  const periods = offeredPeriods();
  // Default to 3 months: most job searches take 3–6 months, so it's the best deal for most people.
  const period: Period = periods.includes(sp.period as Period) ? (sp.period as Period) : periods.includes("quarter") ? "quarter" : "month";
  const maxSave = (p: Period) => Math.max(periodDeal("pro", p).save, periodDeal("premium", p).save);
  const t = T[locale];
  const live = paywallEnabled();
  // Someone on a free trial still needs to be able to buy Pro, so the trial counts as Basic here.
  const trialLeft = user ? trialDaysLeft(user) : null;
  const mine: Plan | null = user && live ? (trialLeft != null ? "basic" : currentPlan(user)) : null;
  const btn = "mt-8 block w-full rounded-full px-5 py-3 text-center text-sm font-medium";

  const paid = (plan: "pro" | "premium") => (
    <PlanButton
      plan={plan}
      period={period}
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
      {periods.length > 1 && (
        <nav aria-label={t.periodLabel} className="mb-8 flex justify-center">
          <div className="inline-flex gap-1 rounded-full border border-line bg-white p-1">
            {periods.map((p) => (
              <Link
                key={p}
                href={`/pricing?period=${p}`}
                scroll={false}
                aria-current={p === period ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm sm:px-4 ${p === period ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
              >
                {t.periodName[p]}
                {p !== "month" && maxSave(p) > 0 && <span className={`ml-1.5 hidden text-xs sm:inline ${p === period ? "text-paper/80" : "text-accent"}`}>{t.saveUpTo(maxSave(p))}</span>}
              </Link>
            ))}
          </div>
        </nav>
      )}
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
          <p className="mt-4 font-display text-5xl">{periodDeal("pro", period).total} kr<span className="text-lg text-muted"> {t.per[period]}</span></p>
          {period !== "month" && <p className="mt-1 text-sm font-medium text-accent">{t.perMonth(periodDeal("pro", period).perMonth, periodDeal("pro", period).save)}</p>}
          <p className="mt-1 text-sm text-muted">{t.billed[period]}</p>
          <p className="mt-6 text-sm text-ink-2">{t.plusPro}</p>
          <Features items={t.pro} soon={t.soon} />
          {paid("pro")}
          {live && TRIAL_DAYS > 0 && mine === "basic" && (
            <p className="mt-3 text-center text-xs text-ink-2">{trialLeft != null ? t.trialLeft(trialLeft) : user?.trial_ends_at ? null : t.trial(TRIAL_DAYS)}</p>
          )}
        </section>

        <section className="flex flex-col rounded-2xl border border-line bg-white p-6 sm:p-8" aria-labelledby="premium-plan">
          <h2 id="premium-plan" className="text-xl font-semibold">Premium</h2>
          <p className="mt-4 font-display text-5xl">{periodDeal("premium", period).total} kr<span className="text-lg text-muted"> {t.per[period]}</span></p>
          {period !== "month" && <p className="mt-1 text-sm font-medium text-accent">{t.perMonth(periodDeal("premium", period).perMonth, periodDeal("premium", period).save)}</p>}
          <p className="mt-1 text-sm text-muted">{t.billed[period]}</p>
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
