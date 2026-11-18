"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { LockedTeaser, UpgradeDialog } from "@/components/billing/Upgrade";
import type { VisiblePlan } from "@/lib/career";

const T = defineT({
  en: {
    goal: "Where do you want to go?",
    goalHint: "A role you'd like to reach. Leave empty and the coach suggests the best direction.",
    goalPlaceholder: "e.g. Supply Chain Manager",
    horizon: "Time frame",
    years: (n: number) => (n === 1 ? "1 year" : `${n} years`),
    build: "Build my career plan",
    update: "Update my plan",
    busy: "Building your career plan… this takes up to a minute",
    preview: "Your first plan is free and shows your role path. Premium adds the skill plan, certifications, alternative routes and salary tips.",
    now: "Now",
    path: "Your path",
    open: (n: number) => (n === 1 ? "1 open job now →" : `${n} open jobs now →`),
    noOpen: "No open jobs right now",
    learn: "Learn",
    skillPlan: "Skill plan",
    prio: { now: "Start now", next: "Next", later: "Later" } as Record<string, string>,
    certs: "Certifications",
    helps: "Helps for",
    alts: "Other routes that fit you",
    gap: "Main gap",
    salary: "Grow your salary",
    salaryNote: "Salary ranges are rough monthly estimates before tax. Check real figures in",
    scb: "SCB's salary statistics",
    first: "Your next 30 days",
    lockedTitle: "Your full career plan",
    locked: "Premium adds a prioritised skill plan with courses, the certifications that matter for each step, alternative routes that fit your background and concrete salary tips.",
    stale: "Your CV changed since this plan was written.",
    written: (d: string) => `Written ${d}`,
    failed: "Something went wrong. Try again.",
  },
  sv: {
    goal: "Vart vill du nå?",
    goalHint: "En roll du vill nå. Lämna tomt så föreslår coachen den bästa riktningen.",
    goalPlaceholder: "t.ex. Supply Chain Manager",
    horizon: "Tidsram",
    years: (n: number) => (n === 1 ? "1 år" : `${n} år`),
    build: "Bygg min karriärplan",
    update: "Uppdatera min plan",
    busy: "Bygger din karriärplan… det tar upp till en minut",
    preview: "Din första plan är gratis och visar din karriärväg. Premium lägger till kompetensplan, certifieringar, andra vägar och lönetips.",
    now: "Nu",
    path: "Din karriärväg",
    open: (n: number) => (n === 1 ? "1 ledigt jobb nu →" : `${n} lediga jobb nu →`),
    noOpen: "Inga lediga jobb just nu",
    learn: "Lär dig",
    skillPlan: "Kompetensplan",
    prio: { now: "Börja nu", next: "Sedan", later: "Längre fram" } as Record<string, string>,
    certs: "Certifieringar",
    helps: "Hjälper för",
    alts: "Andra vägar som passar dig",
    gap: "Största luckan",
    salary: "Öka din lön",
    salaryNote: "Lönespannen är grova uppskattningar per månad före skatt. Se riktiga siffror i",
    scb: "SCB:s lönestatistik",
    first: "Dina kommande 30 dagar",
    lockedTitle: "Din fullständiga karriärplan",
    locked: "Premium lägger till en prioriterad kompetensplan med kurser, de certifieringar som spelar roll för varje steg, andra vägar som passar din bakgrund och konkreta lönetips.",
    stale: "Ditt CV har ändrats sedan planen skrevs.",
    written: (d: string) => `Skriven ${d}`,
    failed: "Något gick fel. Försök igen.",
  },
});

export type CareerData = {
  plan: VisiblePlan;
  target_role: string | null;
  horizon: number;
  created_at: string;
  stale: boolean;
  open_jobs: Record<string, number>;
};

const jobsHref = (role: string) => `/jobs?q=${encodeURIComponent(role.split(/\s*[/|(,]\s*/)[0])}`;

export function CareerCoach({ initial, full, suggestions }: { initial: CareerData | null; full: boolean; suggestions: string[] }) {
  const locale = useLocale();
  const t = T[locale];
  const [data, setData] = useState(initial);
  const [target, setTarget] = useState(initial?.target_role ?? "");
  const [horizon, setHorizon] = useState(initial?.horizon ?? 3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  const build = async () => {
    if (data && !full) return setUpgrade(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/career-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_role: target, horizon }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 402) return setUpgrade(true);
      if (!res.ok) throw new Error(body.error ?? t.failed);
      setData({ ...body, created_at: String(body.created_at) });
    } catch (e) {
      setError((e as Error).message || t.failed);
    } finally {
      setBusy(false);
    }
  };

  const p = data?.plan;
  const count = (role: string) => data?.open_jobs[role] ?? 0;
  const jobsLink = (role: string) =>
    count(role) > 0
      ? <Link href={jobsHref(role)} className="text-sm font-medium text-accent hover:underline">{t.open(count(role))}</Link>
      : <span className="text-sm text-muted">{t.noOpen}</span>;

  return (
    <div className="space-y-6">
      {/* Goal form */}
      <section aria-labelledby="goal-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="goal-heading" className="text-lg font-semibold">{t.goal}</h2>
        <p className="mt-1 text-sm text-ink-2">{t.goalHint}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-xs font-medium text-ink-2">
            <span className="sr-only">{t.goal}</span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              list="career-suggestions"
              maxLength={80}
              placeholder={t.goalPlaceholder}
              className="block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
            />
            <datalist id="career-suggestions">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <fieldset className="flex shrink-0 rounded-full border border-line bg-paper p-1" aria-label={t.horizon}>
            {[1, 3, 5].map((n) => (
              <label key={n} className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm ${horizon === n ? "bg-ink text-paper" : "text-ink-2"}`}>
                <input type="radio" name="horizon" value={n} checked={horizon === n} onChange={() => setHorizon(n)} className="sr-only" />
                {t.years(n)}
              </label>
            ))}
          </fieldset>
        </div>
        {busy ? (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium">
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />{t.busy}
          </p>
        ) : (
          <button type="button" onClick={build} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">
            {data ? t.update : t.build}
          </button>
        )}
        {!full && !data && !busy && <p className="mt-2 text-xs text-muted">{t.preview}</p>}
        {data?.stale && <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm">{t.stale}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-warn">{error}</p>}
      </section>

      {p && (
        <>
          {p.summary && <p className="text-lg leading-relaxed">{p.summary}</p>}

          {/* Role path */}
          <section aria-labelledby="path-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 id="path-heading" className="text-xl font-semibold">{t.path}</h2>
            <ol className="mt-5">
              {p.current_role && (
                <li className="relative pb-6 pl-8">
                  <span aria-hidden className="absolute left-[7px] top-5 h-full w-0.5 bg-accent-soft" />
                  <span aria-hidden className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-accent bg-white" />
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{t.now}</p>
                  <p className="font-semibold">{p.current_role}</p>
                </li>
              )}
              {p.path.map((s, i) => (
                <li key={s.role} className="relative pb-6 pl-8 last:pb-0">
                  {i < p.path.length - 1 && <span aria-hidden className="absolute left-[7px] top-5 h-full w-0.5 bg-accent-soft" />}
                  <span aria-hidden className={`absolute left-0 top-1 h-4 w-4 rounded-full ${i === p.path.length - 1 ? "bg-accent" : "border-2 border-accent bg-accent-soft"}`} />
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">{s.when}</p>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-lg font-semibold">{s.role}</p>
                    {s.salary && <p className="text-sm tabular-nums text-ink-2">{s.salary}</p>}
                  </div>
                  {s.what_changes && <p className="mt-1 text-sm text-ink-2">{s.what_changes}</p>}
                  {s.skills.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted">{t.learn}:</span>
                      {s.skills.map((k) => <span key={k} className="rounded-full border border-line bg-paper px-2 py-0.5">{k}</span>)}
                    </p>
                  )}
                  <div className="mt-2">{jobsLink(s.role)}</div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-muted">
              {t.salaryNote}{" "}
              <a href="https://www.scb.se/lonesok" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{t.scb}</a>.
            </p>
          </section>

          {/* First steps */}
          {p.first_steps.length > 0 && (
            <section aria-labelledby="first-heading" className="rounded-2xl border-2 border-accent/40 bg-white p-5 sm:p-6">
              <h2 id="first-heading" className="text-xl font-semibold">{t.first}</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-accent">
                {p.first_steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </section>
          )}

          {p.locked ? (
            <LockedTeaser plan="premium" title={t.lockedTitle} body={t.locked} />
          ) : (
            <>
              {p.skill_plan.length > 0 && (
                <section aria-labelledby="skills-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <h2 id="skills-heading" className="text-xl font-semibold">{t.skillPlan}</h2>
                  <ul className="mt-4 divide-y divide-line">
                    {p.skill_plan.map((s) => (
                      <li key={s.skill} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{s.skill}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${s.priority === "now" ? "bg-accent text-paper" : s.priority === "next" ? "bg-accent-soft" : "bg-paper-2 text-ink-2"}`}>{t.prio[s.priority]}</span>
                          {s.time && <span className="text-xs text-muted">{s.time}</span>}
                        </div>
                        {s.why && <p className="mt-1 text-sm text-ink-2">{s.why}</p>}
                        {s.how && <p className="mt-1 text-sm">→ {s.how}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {p.certifications.length > 0 && (
                <section aria-labelledby="certs-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <h2 id="certs-heading" className="text-xl font-semibold">{t.certs}</h2>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {p.certifications.map((c) => (
                      <li key={c.name} className="rounded-xl border border-line p-4 text-sm">
                        <p className="font-semibold">{c.name}</p>
                        {c.provider && <p className="text-muted">{c.provider}</p>}
                        {c.for_step && <p className="mt-1 text-xs text-accent">{t.helps}: {c.for_step}</p>}
                        {c.why && <p className="mt-1 text-ink-2">{c.why}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {p.alternatives.length > 0 && (
                <section aria-labelledby="alts-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <h2 id="alts-heading" className="text-xl font-semibold">{t.alts}</h2>
                  <ul className="mt-3 space-y-4">
                    {p.alternatives.map((a) => (
                      <li key={a.role}>
                        <p className="font-semibold">{a.role}</p>
                        {a.why && <p className="text-sm text-ink-2">{a.why}</p>}
                        {a.gap && <p className="text-sm"><span className="font-medium">{t.gap}:</span> {a.gap}</p>}
                        <div className="mt-1">{jobsLink(a.role)}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {p.salary_tips.length > 0 && (
                <section aria-labelledby="salary-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <h2 id="salary-heading" className="text-xl font-semibold">{t.salary}</h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-accent">
                    {p.salary_tips.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </section>
              )}
            </>
          )}

          <p className="text-xs text-muted">
            {t.written(new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Stockholm" }).format(new Date(data!.created_at)))}
          </p>
        </>
      )}
      <UpgradeDialog plan="premium" open={upgrade} onClose={() => setUpgrade(false)} />
    </div>
  );
}
