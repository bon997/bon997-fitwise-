"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    failed: (s: number) => `Import failed (${s})`,
    title: "Import real jobs",
    intro: "Search a job board and add the results to Fitwise. Each import adds about 10 jobs. Platsbanken (Sweden) is free; Google Jobs uses one search from your SerpApi plan.",
    noAi: "ANTHROPIC_API_KEY isn't set, so imported jobs won't get skills extracted and fit scores will be weak.",
    whatPh: "e.g. frontend developer", what: "What jobs",
    wherePh: "e.g. Stockholm", where: "Where",
    source: "Source",
    importing: "Importing… (up to a minute)", import: "Import jobs",
    result: (r: Result) =>
      `Found ${r.fetched}: ${r.inserted} new, ${r.updated} updated. Skills read for ${r.enriched}` +
      (r.failed > 0 ? ` (${r.failed} failed)` : "") +
      (r.duplicates ? `. Skipped ${r.duplicates} duplicate ad${r.duplicates > 1 ? "s" : ""}` : "") + ".",
    why: "Why skills failed:",
  },
  sv: {
    failed: (s: number) => `Importen misslyckades (${s})`,
    title: "Importera riktiga jobb",
    intro: "Sök på en jobbsajt och lägg till resultaten i Fitwise. Varje import lägger till ungefär 10 jobb. Platsbanken är gratis; Google Jobs använder en sökning från din SerpApi-plan.",
    noAi: "ANTHROPIC_API_KEY saknas, så importerade jobb får inga kompetenser utlästa och matchningen blir svag.",
    whatPh: "t.ex. inköpare", what: "Vilka jobb",
    wherePh: "t.ex. Stockholm", where: "Var",
    source: "Källa",
    importing: "Importerar… (upp till en minut)", import: "Importera jobb",
    result: (r: Result) =>
      `Hittade ${r.fetched}: ${r.inserted} nya, ${r.updated} uppdaterade. Kompetenser lästa för ${r.enriched}` +
      (r.failed > 0 ? ` (${r.failed} misslyckades)` : "") +
      (r.duplicates ? `. Hoppade över ${r.duplicates} dubblett${r.duplicates > 1 ? "er" : ""}` : "") + ".",
    why: "Varför kompetenserna inte lästes:",
  },
});

type Result = {
  fetched: number;
  inserted: number;
  updated: number;
  enriched: number;
  failed: number;
  enrich_error?: string;
  duplicates?: number;
};

/** Admin: pull real listings from Platsbanken (free), SerpAPI (Google Jobs) or RapidAPI (JSearch) without a terminal. */
export function ImportJobsForm({
  sources,
}: {
  sources: { serpapi: boolean; rapidapi: boolean; ai: boolean };
}) {
  const t = T[useLocale()];
  const router = useRouter();
  const [source, setSource] = useState("jobtech");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const field =
    "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/jobs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          query,
          location: location || undefined,
          pages: 1,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(body.error ?? t.failed(res.status));
      setResult(body);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-white p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-ink-2">
        {t.intro}
      </p>
      <>
        {!sources.ai && (
          <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
            {t.noAi}
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1.4fr_1fr]">
          <input
            required
            minLength={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.whatPh}
            aria-label={t.what}
            className={field}
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t.wherePh}
            aria-label={t.where}
            className={field}
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label={t.source}
            className={field}
          >
            <option value="jobtech">Platsbanken (Sweden)</option>
            {sources.serpapi && <option value="serpapi">Google Jobs</option>}
            {sources.rapidapi && <option value="rapidapi">JSearch</option>}
          </select>
        </div>
        <button
          disabled={busy}
          className="mt-3 rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60"
        >
          {busy ? t.importing : t.import}
        </button>
      </>
      {result && (
        <p role="status" className="mt-3 text-sm text-accent">
          {t.result(result)}
        </p>
      )}
      {result?.enrich_error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {t.why} {result.enrich_error}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-warn">
          {error}
        </p>
      )}
    </form>
  );
}
