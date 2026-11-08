"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { timeAgo } from "@/lib/format";

type Search = {
  id: string;
  source: "jobtech" | "serpapi" | "rapidapi";
  query: string;
  location: string | null;
  pages: number;
  enabled: boolean;
  last_run_at: string | null;
  last_result: string | null;
};

type RunResult = {
  searches: { query: string; result: string }[];
  skipped: number;
  fetched: number;
  inserted: number;
  enriched: number;
  tagged?: number;
  enrichError?: string;
  expired: number;
  error?: string;
};

const SOURCE = { jobtech: "Platsbanken", serpapi: "Google Jobs", rapidapi: "JSearch" } as const;

const T = defineT({
  en: {
    title: "Daily imports",
    intro: "Save a search once and Fitwise imports the newest jobs for it every night (around 04:00), reads their skills and hides ads that are more than 45 days old.",
    estimate: (n: number) => `About ${n} jobs checked each night.`,
    google: "Google Jobs uses 1 SerpApi search per page every night, about 30 a month (the free plan has 100).",
    what: "What jobs", whatPh: "e.g. inköpare", where: "Where (optional)", wherePh: "e.g. Malmö",
    source: "Source", size: "Jobs per night",
    perNight: (p: number) => `About ${p * 10}`,
    add: "Save daily search", adding: "Saving…",
    ideas: "Ideas:",
    none: "No daily searches yet. Add your first one above.",
    on: "On", off: "Paused",
    never: "Not run yet", last: "Last run",
    remove: "Remove", removeConfirm: "Remove this search? Jobs it already imported stay.", yes: "Remove", no: "Keep",
    runNow: "Run all now", running: "Running… (up to a minute)",
    ran: (r: RunResult) => `Done: ${r.fetched} found, ${r.inserted} new, skills read for ${r.enriched}${r.tagged ? `, Platsbanken tags for ${r.tagged} (AI unavailable)` : ""}${r.expired ? `, ${r.expired} old ads hidden` : ""}.`,
    rest: (n: number) => `${n} searches didn't fit in this run and will go first next time.`,
    failed: "Something went wrong. Please try again.",
  },
  sv: {
    title: "Dagliga importer",
    intro: "Spara en sökning en gång så importerar Fitwise de senaste jobben för den varje natt (runt 04:00), läser ut kompetenserna och döljer annonser som är äldre än 45 dagar.",
    estimate: (n: number) => `Ungefär ${n} jobb kontrolleras varje natt.`,
    google: "Google Jobs använder 1 SerpApi-sökning per sida varje natt, ungefär 30 i månaden (gratisplanen har 100).",
    what: "Vilka jobb", whatPh: "t.ex. inköpare", where: "Var (valfritt)", wherePh: "t.ex. Malmö",
    source: "Källa", size: "Jobb per natt",
    perNight: (p: number) => `Ungefär ${p * 10}`,
    add: "Spara daglig sökning", adding: "Sparar…",
    ideas: "Idéer:",
    none: "Inga dagliga sökningar än. Lägg till den första ovan.",
    on: "På", off: "Pausad",
    never: "Inte körd än", last: "Senast körd",
    remove: "Ta bort", removeConfirm: "Ta bort sökningen? Jobb den redan importerat finns kvar.", yes: "Ta bort", no: "Behåll",
    runNow: "Kör alla nu", running: "Kör… (upp till en minut)",
    ran: (r: RunResult) => `Klart: ${r.fetched} hittade, ${r.inserted} nya, kompetenser lästa för ${r.enriched}${r.tagged ? `, Platsbanken-taggar för ${r.tagged} (AI otillgänglig)` : ""}${r.expired ? `, ${r.expired} gamla annonser dolda` : ""}.`,
    rest: (n: number) => `${n} sökningar fick inte plats i den här körningen och går först nästa gång.`,
    failed: "Något gick fel. Försök igen.",
  },
});

// Common Swedish searches, as a quick start. Clicking one only fills the field.
const IDEAS = ["inköpare", "supply chain", "lager", "logistik", "utvecklare", "ekonomi", "kundtjänst", "säljare"];

export function DailyImports({ searches, estimate, sources }: { searches: Search[]; estimate: number; sources: { serpapi: boolean; rapidapi: boolean } }) {
  const locale = useLocale();
  const t = T[locale];
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<Search["source"]>("jobtech");
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState<RunResult | null>(null);

  const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-accent-soft";

  const call = async (method: string, body: object) => {
    const res = await fetch("/api/admin/import-searches", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) {
      const b = await res?.json().catch(() => ({}));
      setError(b?.error ?? t.failed);
      return false;
    }
    setError(null);
    router.refresh();
    return true;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (await call("POST", { source, query, location: location || undefined, pages })) setQuery("");
    setBusy(false);
  };

  const runNow = async () => {
    setRunning(true);
    setRan(null);
    setError(null);
    const res = await fetch("/api/cron/import-jobs").catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (res?.ok) setRan(body);
    else setError(body?.error ?? t.failed);
    setRunning(false);
    router.refresh();
  };

  return (
    <section aria-labelledby="daily-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="daily-heading" className="text-lg font-semibold">{t.title}</h2>
          <p className="mt-1 text-sm text-ink-2">{t.intro}</p>
          {estimate > 0 && <p className="mt-1 text-sm font-medium">{t.estimate(estimate)}</p>}
        </div>
        {searches.some((s) => s.enabled) && (
          <button type="button" onClick={runNow} disabled={running} className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium hover:border-ink/50 disabled:opacity-60">
            {running ? t.running : t.runNow}
          </button>
        )}
      </div>

      <form onSubmit={add} className="mt-5 grid gap-3 sm:grid-cols-[2fr_1.4fr_1fr_1fr_auto] sm:items-end">
        <label className="text-sm">
          <span className="text-ink-2">{t.what}</span>
          <input id="daily-query" required minLength={2} maxLength={200} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.whatPh} className={`mt-1 ${field}`} />
        </label>
        <label className="text-sm">
          <span className="text-ink-2">{t.where}</span>
          <input id="daily-location" maxLength={100} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.wherePh} className={`mt-1 ${field}`} />
        </label>
        <label className="text-sm">
          <span className="text-ink-2">{t.source}</span>
          <select id="daily-source" value={source} onChange={(e) => setSource(e.target.value as Search["source"])} className={`mt-1 ${field}`}>
            <option value="jobtech">Platsbanken</option>
            {sources.serpapi && <option value="serpapi">Google Jobs</option>}
            {sources.rapidapi && <option value="rapidapi">JSearch</option>}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-ink-2">{t.size}</span>
          <select id="daily-pages" value={pages} onChange={(e) => setPages(Number(e.target.value))} className={`mt-1 ${field}`}>
            {[1, 2, 3].map((p) => <option key={p} value={p}>{t.perNight(p)}</option>)}
          </select>
        </label>
        <button disabled={busy} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60">
          {busy ? t.adding : t.add}
        </button>
      </form>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {t.ideas}
        {IDEAS.map((i) => (
          <button key={i} type="button" onClick={() => setQuery(i)} className="rounded-full border border-line px-2.5 py-1 text-ink-2 hover:border-ink/40">{i}</button>
        ))}
      </p>
      {source === "serpapi" && <p className="mt-2 text-xs text-muted">{t.google}</p>}

      {error && <p role="alert" className="mt-3 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">{error}</p>}
      {ran && (
        <div role="status" className="mt-3 rounded-lg bg-accent-soft px-3 py-2.5 text-sm text-accent">
          <p>{t.ran(ran)}</p>
          {ran.skipped > 0 && <p className="mt-1">{t.rest(ran.skipped)}</p>}
          {ran.enrichError && <p className="mt-1 text-warn">{ran.enrichError}</p>}
        </div>
      )}

      {searches.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-line p-5 text-center text-sm text-ink-2">{t.none}</p>
      ) : (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {searches.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
              <label className="flex shrink-0 items-center gap-2">
                <input type="checkbox" checked={s.enabled} onChange={(e) => call("PATCH", { id: s.id, enabled: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" aria-label={`${s.query}: ${s.enabled ? t.on : t.off}`} />
                <span className={`w-14 text-xs ${s.enabled ? "text-accent" : "text-muted"}`}>{s.enabled ? t.on : t.off}</span>
              </label>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.query}{s.location ? ` · ${s.location}` : ""}</p>
                <p className="text-xs text-muted">
                  {SOURCE[s.source]} · {t.perNight(s.pages)} · {s.last_run_at ? `${t.last} ${timeAgo(new Date(s.last_run_at), locale)}: ${s.last_result ?? ""}` : t.never}
                </p>
              </div>
              {confirming === s.id ? (
                <span className="flex items-center gap-2 text-xs">
                  {t.removeConfirm}
                  <button type="button" onClick={async () => { await call("DELETE", { id: s.id }); setConfirming(null); }} className="font-medium text-warn underline underline-offset-2">{t.yes}</button>
                  <button type="button" onClick={() => setConfirming(null)} className="underline underline-offset-2">{t.no}</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirming(s.id)} className="text-xs text-muted underline underline-offset-2 hover:text-warn">{t.remove}</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
