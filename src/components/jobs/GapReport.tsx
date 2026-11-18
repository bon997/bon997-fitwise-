"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { LockedTeaser, UpgradeDialog } from "@/components/billing/Upgrade";
import type { GapReport as Report } from "@/lib/agents/gap-report";

const T = defineT({
  en: {
    title: "CV gap analysis",
    intro: "See what you already bring to this job, what's missing and exactly what to add to your CV, including certifications and the keywords recruiters' ATS systems look for.",
    run: "Analyse my CV for this job",
    preview: "Your first analysis is free. After that it's part of Pro.",
    busy: "Reading the job and your CV… about 15 seconds",
    locked: "You've used your free analysis. Pro analyses every job you look at: strengths, missing skills, CV edits, certifications and ATS keywords.",
    lockedTitle: "Analyse every job with Pro",
    match: "Match",
    industry: "Industry match",
    strengths: "Your strengths for this job",
    missing: "Missing, and how to close it",
    must: "Must-have",
    nice: "Nice to have",
    improve: "Improve your CV for this job",
    certs: "Certifications that would help",
    ats: "ATS keywords to add",
    atsTips: "ATS tips",
    stale: "Your CV changed since this was written.",
    refresh: "Update analysis",
    written: (d: string) => `Written ${d}`,
    failed: "Something went wrong. Try again.",
  },
  sv: {
    title: "CV-analys",
    intro: "Se vad du redan har för jobbet, vad som saknas och exakt vad du ska lägga till i ditt CV, inklusive certifieringar och nyckelord som rekryterares ATS-system letar efter.",
    run: "Analysera mitt CV för jobbet",
    preview: "Din första analys är gratis. Därefter ingår den i Pro.",
    busy: "Läser jobbet och ditt CV… ungefär 15 sekunder",
    locked: "Du har använt din gratis analys. Pro analyserar varje jobb du tittar på: styrkor, saknade kompetenser, CV-ändringar, certifieringar och ATS-nyckelord.",
    lockedTitle: "Analysera varje jobb med Pro",
    match: "Matchning",
    industry: "Branschmatchning",
    strengths: "Dina styrkor för jobbet",
    missing: "Saknas, och hur du fyller luckan",
    must: "Krav",
    nice: "Meriterande",
    improve: "Förbättra ditt CV för jobbet",
    certs: "Certifieringar som skulle hjälpa",
    ats: "ATS-nyckelord att lägga till",
    atsTips: "ATS-tips",
    stale: "Ditt CV har ändrats sedan analysen skrevs.",
    refresh: "Uppdatera analysen",
    written: (d: string) => `Skriven ${d}`,
    failed: "Något gick fel. Försök igen.",
  },
});

export type GapAccess = "full" | "preview" | "locked";

export function GapReport({
  jobId,
  fitScore,
  access,
  initial,
}: {
  jobId: string;
  fitScore: number | null;
  access: GapAccess;
  initial: { report: Report; created_at: string; stale: boolean } | null;
}) {
  const locale = useLocale();
  const t = T[locale];
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  const run = async (refresh = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/gap-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 402) return setUpgrade(true);
      if (!res.ok) throw new Error(body.error ?? t.failed);
      setData({ report: body.report, created_at: body.created_at, stale: false });
    } catch (e) {
      setError((e as Error).message || t.failed);
    } finally {
      setBusy(false);
    }
  };

  const head = (
    <h2 id="gap-heading" className="text-lg font-semibold">{t.title}</h2>
  );

  if (!data) {
    return (
      <section aria-labelledby="gap-heading" className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        {head}
        {access === "locked" ? (
          <div className="mt-3"><LockedTeaser plan="pro" title={t.lockedTitle} body={t.locked} /></div>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-ink-2">{t.intro}</p>
            {busy ? (
              <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                {t.busy}
              </p>
            ) : (
              <button type="button" onClick={() => run()} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">
                {t.run}
              </button>
            )}
            {access === "preview" && !busy && <p className="mt-2 text-xs text-muted">{t.preview}</p>}
            {error && <p role="alert" className="mt-3 text-sm text-warn">{error}</p>}
          </>
        )}
        <UpgradeDialog plan="pro" open={upgrade} onClose={() => setUpgrade(false)} />
      </section>
    );
  }

  const r = data.report;
  const written = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" }).format(new Date(data.created_at));

  return (
    <section aria-labelledby="gap-heading" className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        {head}
        <p className="text-sm text-ink-2">
          {fitScore != null && <><span className="font-semibold tabular-nums text-ink">{fitScore}%</span> {t.match} · </>}
          <span className="font-semibold tabular-nums text-ink">{r.industry_match.score}%</span> {t.industry}
        </p>
      </div>

      {data.stale && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-warn-soft px-3 py-2 text-sm">
          {t.stale}
          <button type="button" disabled={busy} onClick={() => run(true)} className="font-medium text-accent hover:underline disabled:opacity-50">
            {busy ? t.busy : t.refresh}
          </button>
        </p>
      )}

      {r.summary && <p className="mt-3 leading-relaxed">{r.summary}</p>}
      {[r.industry_match.note, r.experience_note, r.education_note].some(Boolean) && (
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          {[r.industry_match.note, r.experience_note, r.education_note].filter(Boolean).map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}

      {r.strengths.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">{t.strengths}</h3>
          <ul className="mt-2 space-y-2">
            {r.strengths.map((s) => (
              <li key={s.title} className="flex gap-2 text-sm">
                <span aria-hidden className="mt-0.5 text-accent">✓</span>
                <span><span className="font-medium">{s.title}</span>{s.evidence && <span className="text-ink-2"> — {s.evidence}</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.missing.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">{t.missing}</h3>
          <ul className="mt-2 space-y-2.5">
            {r.missing.map((m) => (
              <li key={m.skill} className="text-sm">
                <span className="font-medium">{m.skill}</span>{" "}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${m.importance === "must" ? "bg-warn-soft text-ink" : "bg-paper-2 text-ink-2"}`}>
                  {m.importance === "must" ? t.must : t.nice}
                </span>
                {m.how_to_close && <p className="mt-0.5 text-ink-2">{m.how_to_close}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.improvements.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">{t.improve}</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-2 marker:text-accent">
            {r.improvements.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      )}

      {r.certifications.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">{t.certs}</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {r.certifications.map((c) => (
              <li key={c.name}>
                <span className="font-medium">{c.name}</span>
                {c.provider && <span className="text-muted"> · {c.provider}</span>}
                {c.why && <p className="text-ink-2">{c.why}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(r.ats_keywords.length > 0 || r.ats_tips.length > 0) && (
        <div className="mt-6">
          {r.ats_keywords.length > 0 && (
            <>
              <h3 className="text-sm font-semibold">{t.ats}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {r.ats_keywords.map((k) => <li key={k} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs">{k}</li>)}
              </ul>
            </>
          )}
          {r.ats_tips.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">{t.atsTips}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2 marker:text-accent">
                {r.ats_tips.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">{t.written(written)}</p>
      {error && <p role="alert" className="mt-2 text-sm text-warn">{error}</p>}
    </section>
  );
}
