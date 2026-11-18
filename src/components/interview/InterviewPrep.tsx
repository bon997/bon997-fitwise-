"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { LockedTeaser, UpgradeDialog } from "@/components/billing/Upgrade";
import type { InterviewPack, Category } from "@/lib/agents/interview";
import type { CoachAccess } from "@/lib/interview";

export type VisiblePack = InterviewPack & { locked_questions: number };

const T = defineT({
  en: {
    title: "Questions and answers",
    intro: "15–20 questions this employer is likely to ask, each with a suggested answer built from your CV, plus STAR examples and questions to ask them.",
    run: "Prepare me for this interview",
    preview: "Free preview: you'll see the first 3 questions. Premium shows the full pack.",
    busy: "Writing your interview pack… this takes about 30 seconds",
    lockedTitle: "Interview prep for every job",
    locked: "You've used your free preview. Premium writes a full interview pack for every job: 15–20 questions with answers from your CV, STAR examples and practice interviews with a readiness score.",
    moreLocked: (n: number) => `${n} more questions, STAR examples and questions to ask the employer are in Premium.`,
    why: "Why they ask",
    answer: "Suggested answer",
    tip: "Tip",
    star: "Your STAR examples",
    starHint: "Short stories from your own experience. Reuse them for many questions.",
    s: "Situation", t: "Task", a: "Action", r: "Result",
    ask: "Questions to ask them",
    salary: "Salary question",
    stale: "Your CV changed since this was written.",
    refresh: "Update pack",
    failed: "Something went wrong. Try again.",
    cats: { motivation: "Motivation", experience: "Experience", technical: "Role-specific", situational: "Situational", culture: "Team and culture" } as Record<Category, string>,
  },
  sv: {
    title: "Frågor och svar",
    intro: "15–20 frågor som arbetsgivaren troligen ställer, var och en med ett förslag på svar utifrån ditt CV, plus STAR-exempel och frågor du kan ställa.",
    run: "Förbered mig för intervjun",
    preview: "Gratis förhandsvisning: du ser de 3 första frågorna. Premium visar hela paketet.",
    busy: "Skriver ditt intervjupaket… det tar ungefär 30 sekunder",
    lockedTitle: "Intervjuförberedelse för varje jobb",
    locked: "Du har använt din gratis förhandsvisning. Premium skriver ett komplett intervjupaket för varje jobb: 15–20 frågor med svar utifrån ditt CV, STAR-exempel och övningsintervjuer med beredskapspoäng.",
    moreLocked: (n: number) => `${n} frågor till, STAR-exempel och frågor till arbetsgivaren finns i Premium.`,
    why: "Varför de frågar",
    answer: "Förslag på svar",
    tip: "Tips",
    star: "Dina STAR-exempel",
    starHint: "Korta berättelser från din egen erfarenhet. Använd dem till flera frågor.",
    s: "Situation", t: "Uppgift", a: "Handling", r: "Resultat",
    ask: "Frågor du kan ställa",
    salary: "Lönefrågan",
    stale: "Ditt CV har ändrats sedan paketet skrevs.",
    refresh: "Uppdatera paketet",
    failed: "Något gick fel. Försök igen.",
    cats: { motivation: "Motivation", experience: "Erfarenhet", technical: "Rollspecifik", situational: "Situationsbaserad", culture: "Team och kultur" } as Record<Category, string>,
  },
});

export function InterviewPrep({ jobId, access, initial, stale: initialStale }: {
  jobId: string; access: CoachAccess; initial: VisiblePack | null; stale: boolean;
}) {
  const t = T[useLocale()];
  const [pack, setPack] = useState(initial);
  const [stale, setStale] = useState(initialStale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  const run = async (refresh = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/interview-prep`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 402) return setUpgrade(true);
      if (!res.ok) throw new Error(body.error ?? t.failed);
      setPack(body.pack);
      setStale(false);
    } catch (e) {
      setError((e as Error).message || t.failed);
    } finally {
      setBusy(false);
    }
  };

  const spinner = (
    <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      {t.busy}
    </p>
  );

  return (
    <section aria-labelledby="prep-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="prep-heading" className="text-xl font-semibold">{t.title}</h2>

      {!pack ? (
        access === "locked" ? (
          <div className="mt-3"><LockedTeaser plan="premium" title={t.lockedTitle} body={t.locked} /></div>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-ink-2">{t.intro}</p>
            {busy ? spinner : (
              <button type="button" onClick={() => run()} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">{t.run}</button>
            )}
            {access === "preview" && !busy && <p className="mt-2 text-xs text-muted">{t.preview}</p>}
          </>
        )
      ) : (
        <>
          {stale && access === "full" && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-warn-soft px-3 py-2 text-sm">
              {t.stale}
              <button type="button" disabled={busy} onClick={() => run(true)} className="font-medium text-accent hover:underline disabled:opacity-50">{busy ? t.busy : t.refresh}</button>
            </p>
          )}
          {pack.focus && <p className="mt-3 leading-relaxed">{pack.focus}</p>}

          <ol className="mt-5 space-y-3">
            {pack.questions.map((q, i) => (
              <li key={i}>
                <details className="group rounded-xl border border-line bg-paper/40 open:bg-white">
                  <summary className="flex cursor-pointer list-none gap-3 p-4">
                    <span className="mt-0.5 font-display text-lg tabular-nums text-accent">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">{q.question}</span>
                      <span className="mt-1 inline-block rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-2">{t.cats[q.category]}</span>
                    </span>
                    <span aria-hidden className="mt-1 text-muted transition-transform group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="space-y-3 px-4 pb-4 pl-11 text-sm">
                    {q.why && <p className="text-ink-2"><span className="font-medium text-ink">{t.why}: </span>{q.why}</p>}
                    {q.answer && (
                      <div>
                        <p className="font-medium">{t.answer}</p>
                        <p className="mt-1 whitespace-pre-line rounded-lg bg-accent-soft/50 p-3 leading-relaxed">{q.answer}</p>
                      </div>
                    )}
                    {q.tip && <p className="text-ink-2"><span className="font-medium text-ink">{t.tip}: </span>{q.tip}</p>}
                  </div>
                </details>
              </li>
            ))}
          </ol>

          {pack.locked_questions > 0 && (
            <div className="mt-4"><LockedTeaser plan="premium" title={t.lockedTitle} body={t.moreLocked(pack.locked_questions)} /></div>
          )}

          {pack.star.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold">{t.star}</h3>
              <p className="mt-1 text-sm text-ink-2">{t.starHint}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {pack.star.map((s) => (
                  <article key={s.title} className="rounded-xl border border-line p-4 text-sm">
                    <h4 className="font-semibold">{s.title}</h4>
                    <dl className="mt-2 space-y-1.5">
                      {([[t.s, s.situation], [t.t, s.task], [t.a, s.action], [t.r, s.result]] as const).map(([k, v]) => v && (
                        <div key={k}><dt className="inline font-medium text-accent">{k}: </dt><dd className="inline text-ink-2">{v}</dd></div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          )}

          {pack.ask_them.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold">{t.ask}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2 marker:text-accent">
                {pack.ask_them.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
          {pack.salary_tip && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">{t.salary}</h3>
              <p className="mt-1 text-sm text-ink-2">{pack.salary_tip}</p>
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-warn">{error}</p>}
      <UpgradeDialog plan="premium" open={upgrade} onClose={() => setUpgrade(false)} />
    </section>
  );
}
