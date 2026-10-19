"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  fetched: number;
  inserted: number;
  updated: number;
  enriched: number;
  failed: number;
  enrich_error?: string;
};

/** Admin: pull real listings from Platsbanken (free), SerpAPI (Google Jobs) or RapidAPI (JSearch) without a terminal. */
export function ImportJobsForm({
  sources,
}: {
  sources: { serpapi: boolean; rapidapi: boolean; ai: boolean };
}) {
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
        throw new Error(body.error ?? `Import failed (${res.status})`);
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
      <h2 className="text-lg font-semibold">Import real jobs</h2>
      <p className="mt-1 text-sm text-ink-2">
        Search a job board and add the results to Fitwise. Each import adds
        about 10 jobs. Platsbanken (Sweden) is free; Google Jobs uses one search
        from your SerpApi plan.
      </p>
      <>
        {!sources.ai && (
          <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
            ANTHROPIC_API_KEY isn&apos;t set, so imported jobs won&apos;t get
            skills extracted and fit scores will be weak.
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1.4fr_1fr]">
          <input
            required
            minLength={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. frontend developer"
            aria-label="What jobs"
            className={field}
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Stockholm"
            aria-label="Where"
            className={field}
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label="Source"
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
          {busy ? "Importing… (up to a minute)" : "Import jobs"}
        </button>
      </>
      {result && (
        <p role="status" className="mt-3 text-sm text-accent">
          Found {result.fetched}: {result.inserted} new, {result.updated}{" "}
          updated. Skills read for {result.enriched}
          {result.failed > 0 ? ` (${result.failed} failed)` : ""}.
        </p>
      )}
      {result?.enrich_error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          Why skills failed: {result.enrich_error}
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
