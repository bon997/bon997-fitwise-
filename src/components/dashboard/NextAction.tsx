import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { defineT } from "@/i18n/config";
import { skillLabel } from "@/lib/format";
import type { ChecklistItem, NextAction } from "@/lib/next-action";

const T = defineT({
  en: {
    eyebrow: "Your next step",
    apply: (n: number) => (n === 1 ? "A job fits you well — apply today" : `${n} jobs fit you well — apply today`),
    applyBody: (title: string, company: string, score: number) => `Start with ${title} at ${company}: ${score} fit. Strong matches get filled fast.`,
    applyCta: "Open the job",
    profile: "Make your profile stronger",
    profileCta: "Update my profile",
    learn: (skill: string) => `Learn ${skill}`,
    learnBody: (skill: string, n: number) => `${skill} is missing from ${n} of your near-miss jobs. Adding it is the quickest way to raise your scores.`,
    learnCta: "See jobs that need it",
    browse: "Find your next match",
    browseBody: "Browse new jobs. We score every one against your profile.",
    browseCta: "Browse jobs",
    also: "Also worth doing",
    step: STEP_EN,
    points: (n: number) => `+${n} profile strength`,
    alsoLearn: (skill: string, n: number) => `Learn ${skill} — missing from ${n} near-miss ${n === 1 ? "job" : "jobs"}`,
  },
  sv: {
    eyebrow: "Ditt nästa steg",
    apply: (n: number) => (n === 1 ? "Ett jobb passar dig bra — sök i dag" : `${n} jobb passar dig bra — sök i dag`),
    applyBody: (title: string, company: string, score: number) => `Börja med ${title} på ${company}: ${score} i matchning. Bra jobb tillsätts snabbt.`,
    applyCta: "Öppna jobbet",
    profile: "Gör din profil starkare",
    profileCta: "Uppdatera min profil",
    learn: (skill: string) => `Lär dig ${skill}`,
    learnBody: (skill: string, n: number) => `${skill} saknas i ${n} av dina nästan-matchningar. Det är det snabbaste sättet att höja din matchning.`,
    learnCta: "Visa jobb som kräver det",
    browse: "Hitta din nästa matchning",
    browseBody: "Bläddra bland nya jobb. Vi matchar varje jobb mot din profil.",
    browseCta: "Bläddra bland jobb",
    also: "Också värt att göra",
    step: STEP_SV,
    points: (n: number) => `+${n} profilstyrka`,
    alsoLearn: (skill: string, n: number) => `Lär dig ${skill} — saknas i ${n} nästan-matchningar`,
  },
});

/** One line per checklist step: what to do, given how far along the user is. */
function STEP_EN(i: ChecklistItem): string {
  switch (i.key) {
    case "skills": return `Add ${(i.want ?? 15) - (i.have ?? 0)} more skills (${i.have} of ${i.want})`;
    case "roles": return `Add ${(i.want ?? 3) - (i.have ?? 0)} more past ${(i.want ?? 3) - (i.have ?? 0) === 1 ? "role" : "roles"}`;
    case "described": return `Describe ${i.want} roles in 2–3 sentences each (${i.have} of ${i.want} done)`;
    case "dated": return "Add start dates to every role";
    case "years": return "Add your total years of experience";
    case "education": return "Add your highest education — 20 of 100 fit points";
    case "places": return "Choose where you want to work, or remote";
  }
}
function STEP_SV(i: ChecklistItem): string {
  switch (i.key) {
    case "skills": return `Lägg till ${(i.want ?? 15) - (i.have ?? 0)} kompetenser till (${i.have} av ${i.want})`;
    case "roles": return `Lägg till ${(i.want ?? 3) - (i.have ?? 0)} tidigare ${(i.want ?? 3) - (i.have ?? 0) === 1 ? "roll" : "roller"}`;
    case "described": return `Beskriv ${i.want} roller med 2–3 meningar var (${i.have} av ${i.want} klara)`;
    case "dated": return "Lägg till startdatum för varje roll";
    case "years": return "Lägg till hur många års erfarenhet du har";
    case "education": return "Lägg till din högsta utbildning — 20 av 100 poäng";
    case "places": return "Välj var du vill jobba, eller distans";
  }
}

export function stepText(i: ChecklistItem, locale: Locale) {
  return T[locale].step(i);
}

export function NextActionCard({
  action, profileStep, topGap, locale,
}: {
  action: NextAction;
  profileStep: ChecklistItem | null;
  topGap: { skill: string; jobs: number } | null;
  locale: Locale;
}) {
  const t = T[locale];
  let title: string, body: string, href: string, cta: string;
  switch (action.kind) {
    case "apply":
      title = t.apply(action.ready); body = t.applyBody(action.title, action.company, action.score);
      href = `/jobs/${action.jobId}`; cta = t.applyCta; break;
    case "profile":
      title = t.profile; body = `${t.step(action.step)}${action.step.gain > 0 ? ` · ${t.points(action.step.gain)}` : ""}`;
      href = "/profile"; cta = t.profileCta; break;
    case "learn":
      title = t.learn(skillLabel(action.skill)); body = t.learnBody(skillLabel(action.skill), action.jobs);
      href = `/jobs?q=${encodeURIComponent(action.skill)}`; cta = t.learnCta; break;
    default:
      title = t.browse; body = t.browseBody; href = "/jobs"; cta = t.browseCta;
  }

  // Up to two secondary hints that aren't the main action.
  const also: { text: string; href: string }[] = [];
  if (action.kind !== "profile" && profileStep && profileStep.gain > 0) {
    also.push({ text: `${t.step(profileStep)} · ${t.points(profileStep.gain)}`, href: "/profile" });
  }
  if (action.kind !== "learn" && topGap) {
    also.push({ text: t.alsoLearn(skillLabel(topGap.skill), topGap.jobs), href: `/jobs?q=${encodeURIComponent(topGap.skill)}` });
  }

  return (
    <section aria-labelledby="next-heading" className="rounded-2xl border-2 border-accent bg-accent-soft/60 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t.eyebrow}</p>
      <h2 id="next-heading" className="mt-1 font-display text-2xl sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-ink-2">{body}</p>
      <Link href={href} className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2">
        {cta} →
      </Link>
      {also.length > 0 && (
        <div className="mt-5 border-t border-accent/20 pt-4">
          <p className="text-xs font-medium text-muted">{t.also}</p>
          <ul className="mt-2 space-y-1.5">
            {also.map((a) => (
              <li key={a.href + a.text} className="text-sm">
                <Link href={a.href} className="text-ink-2 underline decoration-line underline-offset-2 hover:text-ink">{a.text}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function NextActionSkeleton() {
  return (
    <div aria-hidden className="h-[188px] animate-pulse rounded-2xl border-2 border-line bg-white/60" />
  );
}
