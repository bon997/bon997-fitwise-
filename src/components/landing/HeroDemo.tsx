"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { computeFitScore } from "@/lib/ai/fit-score";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

/**
 * Hero demo: visitors tick skills and experience and watch the fit score change.
 * It runs the real scoring formula from the job pages (skills + experience here),
 * so the numbers are honest, not animation for show.
 */

type DemoJob = {
  id: string;
  company: string;
  minYears: number;
  skills: { key: string; required: boolean }[];
  start: string[]; // skills ticked when the card first appears
};

const JOBS: DemoJob[] = [
  {
    id: "buyer",
    company: "Nordhamn Logistik",
    minYears: 3,
    skills: [
      { key: "procurement", required: true },
      { key: "sap", required: true },
      { key: "negotiation", required: true },
      { key: "excel", required: false },
      { key: "supplier management", required: false },
    ],
    start: ["procurement", "negotiation", "excel"],
  },
  {
    id: "designer",
    company: "Northwind Labs",
    minYears: 5,
    skills: [
      { key: "figma", required: true },
      { key: "design systems", required: true },
      { key: "user research", required: true },
      { key: "prototyping", required: false },
      { key: "motion design", required: false },
    ],
    start: ["figma", "design systems", "prototyping"],
  },
  {
    id: "warehouse",
    company: "Lagerhuset Syd",
    minYears: 1,
    skills: [
      { key: "forklift license", required: true },
      { key: "warehouse management", required: true },
      { key: "inventory management", required: false },
      { key: "wms", required: false },
    ],
    start: ["forklift license", "inventory management"],
  },
];

const YEARS = [0, 2, 5] as const;

const T = defineT({
  en: {
    example: "Try it",
    roles: { buyer: "Buyer", designer: "Product designer", warehouse: "Warehouse worker" } as Record<string, string>,
    meta: {
      buyer: "Gothenburg · Full-time · 38–45k SEK / mo",
      designer: "Stockholm · Hybrid · 65–78k SEK / mo",
      warehouse: "Malmö · Full-time · 27–30k SEK / mo",
    } as Record<string, string>,
    skills: {
      procurement: "Procurement", sap: "SAP", negotiation: "Negotiation", excel: "Excel", "supplier management": "Supplier management",
      figma: "Figma", "design systems": "Design systems", "user research": "User research", prototyping: "Prototyping", "motion design": "Motion design",
      "forklift license": "Forklift licence", "warehouse management": "Warehouse work", "inventory management": "Inventory", wms: "WMS",
    } as Record<string, string>,
    yourSkills: "Your skills — tap to change",
    required: "must-have",
    experience: "Your experience",
    years: (y: number) => (y === 5 ? "5+ yrs" : `${y} yrs`),
    asks: (y: number) => `The job asks for ${y}+ year${y === 1 ? "" : "s"}.`,
    fit: "fit",
    allSet: "You meet every must-have.",
    missing: (names: string) => `Missing must-have: ${names}. That caps the score.`,
    roleLabel: "Example job",
    same: "Same formula as on every real job.",
    cta: "Get your own scores →",
  },
  sv: {
    example: "Testa",
    roles: { buyer: "Inköpare", designer: "Produktdesigner", warehouse: "Lagerarbetare" } as Record<string, string>,
    meta: {
      buyer: "Göteborg · Heltid · 38–45 tkr / mån",
      designer: "Stockholm · Hybrid · 65–78 tkr / mån",
      warehouse: "Malmö · Heltid · 27–30 tkr / mån",
    } as Record<string, string>,
    skills: {
      procurement: "Inköp", sap: "SAP", negotiation: "Förhandling", excel: "Excel", "supplier management": "Leverantörskontakter",
      figma: "Figma", "design systems": "Designsystem", "user research": "Användarresearch", prototyping: "Prototyper", "motion design": "Motion design",
      "forklift license": "Truckkort", "warehouse management": "Lagerarbete", "inventory management": "Inventering", wms: "WMS",
    } as Record<string, string>,
    yourSkills: "Dina kompetenser — tryck för att ändra",
    required: "krav",
    experience: "Din erfarenhet",
    years: (y: number) => (y === 5 ? "5+ år" : `${y} år`),
    asks: (y: number) => `Jobbet kräver ${y}+ år.`,
    fit: "match",
    allSet: "Du uppfyller alla krav.",
    missing: (names: string) => `Saknar krav: ${names}. Det sätter ett tak för poängen.`,
    roleLabel: "Exempeljobb",
    same: "Samma formel som på alla riktiga jobb.",
    cta: "Få dina egna poäng →",
  },
});

/** Counts from the previous number to the new one so changes are easy to follow. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 450);
      const v = Math.round(a + (target - a) * (1 - (1 - p) ** 3));
      setShown(v);
      from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

export function HeroDemo() {
  const t = T[useLocale()];
  const [jobId, setJobId] = useState(JOBS[0].id);
  const job = JOBS.find((j) => j.id === jobId)!;
  const [have, setHave] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(JOBS.map((j) => [j.id, new Set(j.start)])),
  );
  const [years, setYears] = useState<number>(5);

  const mine = have[job.id];
  const result = computeFitScore(
    { skills: [...mine], yearsExperience: years, seniority: null, preferences: {} },
    { skills: job.skills.map((s) => ({ name: s.key, required: s.required })), minYears: job.minYears, seniority: null, location: null, remote: false },
  );
  const shown = useCountUp(result.score);
  const missingRequired = job.skills.filter((s) => s.required && !mine.has(s.key)).map((s) => t.skills[s.key]);

  const toggle = (key: string) =>
    setHave((prev) => {
      const next = new Set(prev[job.id]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [job.id]: next };
    });

  return (
    <div className="relative">
      <div className="absolute inset-x-6 -bottom-3 h-full rounded-2xl border border-line bg-paper-2" aria-hidden />
      <article className="relative rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_-24px_rgba(21,23,28,0.35)] sm:p-6">
        <span className="absolute -top-3 left-5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
          {t.example}
        </span>

        {/* Role tabs */}
        <div role="tablist" aria-label={t.roleLabel} className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {JOBS.map((j) => (
            <button
              key={j.id}
              role="tab"
              type="button"
              aria-selected={j.id === jobId}
              onClick={() => setJobId(j.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                j.id === jobId ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2"
              }`}
            >
              {t.roles[j.id]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{job.company}</p>
            <h3 className="mt-1 text-lg font-semibold leading-snug">{t.roles[job.id]}</h3>
            <p className="mt-1 text-sm text-ink-2">{t.meta[job.id]}</p>
          </div>
          <div className="shrink-0">
            <FitScoreRing score={shown} label={t.fit} />
            {/* Announce only the final number, not every step of the count-up. */}
            <span className="sr-only" aria-live="polite">{result.score}</span>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs font-medium text-muted">{t.yourSkills}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {job.skills.map((s) => {
              const on = mine.has(s.key);
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(s.key)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      on
                        ? "border-transparent bg-accent-soft text-accent"
                        : "border-dashed border-warn/50 bg-white text-warn hover:bg-warn-soft"
                    }`}
                  >
                    <span aria-hidden>{on ? "✓" : "+"}</span>
                    {t.skills[s.key]}
                    {s.required && <span className="font-normal opacity-70">· {t.required}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-xs font-medium text-muted">{t.experience}</p>
            <div role="radiogroup" aria-label={t.experience} className="inline-flex rounded-full border border-line p-0.5">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  role="radio"
                  aria-checked={years === y}
                  onClick={() => setYears(y)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${years === y ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
                >
                  {t.years(y)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">{t.asks(job.minYears)}</p>
          </div>

          <p className={`mt-3 min-h-[2.5em] text-xs leading-relaxed ${missingRequired.length ? "text-warn" : "text-accent"}`}>
            {missingRequired.length ? t.missing(missingRequired.join(", ")) : t.allSet}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-xs text-muted">{t.same}</span>
          <Link href="/signup" className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper hover:bg-ink-2">
            {t.cta}
          </Link>
        </div>
      </article>
    </div>
  );
}
