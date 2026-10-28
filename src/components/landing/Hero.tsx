import { ButtonLink } from "@/components/ui/ButtonLink";
import { HeroDemo } from "./HeroDemo";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    badge: "Free during beta · AI fit scores for every job",
    h1a: "Stop guessing.",
    h1b: "Know where you fit.",
    lead: "Upload your resume once. Fitwise scores every job against your real skills, shows exactly what's missing, and drafts a cover letter for the ones worth your time.",
    cta: "Upload your resume — free",
    browse: "Browse jobs",
    note: "No credit card. Your resume stays private.",
  },
  sv: {
    badge: "Gratis under beta · AI-poäng för varje jobb",
    h1a: "Sluta gissa.",
    h1b: "Se var du passar in.",
    lead: "Ladda upp ditt CV en gång. Fitwise jämför varje jobb med dina riktiga kompetenser, visar exakt vad som saknas och skriver ett utkast till personligt brev för de jobb som är värda din tid.",
    cta: "Ladda upp ditt CV — gratis",
    browse: "Se jobb",
    note: "Inget kreditkort. Ditt CV förblir privat.",
  },
});

export async function Hero() {
  const t = T[await getLocale()];
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-24">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-3 py-1 text-xs text-ink-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t.badge}
        </p>
        <h1 className="mt-6 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          {t.h1a}
          <br />
          <em className="text-accent">{t.h1b}</em>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">{t.lead}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/signup">{t.cta}</ButtonLink>
          <ButtonLink href="/jobs" variant="secondary">
            {t.browse}
          </ButtonLink>
        </div>
        <p className="mt-4 text-xs text-muted">{t.note}</p>
      </div>
      <div className="min-w-0 md:pl-6">
        <HeroDemo />
      </div>
    </section>
  );
}
