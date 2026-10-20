"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    reasons: [
      { value: "not_my_role", label: "Not my kind of role" },
      { value: "wrong_location", label: "Wrong location" },
      { value: "salary_too_low", label: "Salary too low" },
      { value: "wrong_seniority", label: "Wrong level" },
      { value: "company", label: "Hide this company" },
      { value: "other", label: "Other" },
    ],
    error: "Something went wrong",
    hidden: "Hidden. We'll show fewer jobs like this.",
    undo: "Undo",
    refresh: "Refresh list",
    saved: "★ Saved",
    save: "☆ Save",
    why: "Why not interested?",
    cancel: "Cancel",
    notForMe: "Not for me",
    notInterested: "Not interested",
  },
  sv: {
    reasons: [
      { value: "not_my_role", label: "Inte min typ av roll" },
      { value: "wrong_location", label: "Fel ort" },
      { value: "salary_too_low", label: "För låg lön" },
      { value: "wrong_seniority", label: "Fel nivå" },
      { value: "company", label: "Dölj det här företaget" },
      { value: "other", label: "Annat" },
    ],
    error: "Något gick fel",
    hidden: "Dolt. Vi visar färre jobb som det här.",
    undo: "Ångra",
    refresh: "Uppdatera listan",
    saved: "★ Sparat",
    save: "☆ Spara",
    why: "Varför inte intresserad?",
    cancel: "Avbryt",
    notForMe: "Inte för mig",
    notInterested: "Inte intresserad",
  },
});

async function call(url: string, init: RequestInit, fallback: string) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error ?? fallback);
}

/** Save and "Not interested" buttons. Every click also teaches the "For you" ranking. */
export function JobActions({ jobId, saved: initialSaved, compact = false }: { jobId: string; saved: boolean; compact?: boolean }) {
  const t = T[useLocale()];
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [state, setState] = useState<"idle" | "asking" | "dismissed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  const toggleSave = () =>
    run(async () => {
      if (saved) await call(`/api/saved-jobs?job_id=${jobId}`, { method: "DELETE" }, t.error);
      else await call("/api/saved-jobs", { method: "POST", body: JSON.stringify({ job_id: jobId }) }, t.error);
      setSaved(!saved);
      router.refresh();
    });

  const dismiss = (reason: string) =>
    run(async () => {
      await call(`/api/jobs/${jobId}/dismiss`, { method: "POST", body: JSON.stringify({ reason }) }, t.error);
      setState("dismissed");
    });

  const undo = () =>
    run(async () => {
      await call(`/api/jobs/${jobId}/dismiss`, { method: "DELETE" }, t.error);
      setState("idle");
    });

  if (state === "dismissed") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted">
        {t.hidden}
        <button onClick={undo} disabled={pending} className="font-medium text-ink underline underline-offset-2">
          {t.undo}
        </button>
        <button onClick={() => router.refresh()} className="text-xs text-muted hover:text-ink">
          {t.refresh}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleSave}
        disabled={pending}
        aria-pressed={saved}
        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
          saved ? "bg-ink text-paper" : "border border-ink/20 text-ink hover:border-ink/50"
        }`}
      >
        {saved ? t.saved : t.save}
      </button>
      {state === "asking" ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.why}>
          {t.reasons.map((r) => (
            <button
              key={r.value}
              onClick={() => dismiss(r.value)}
              disabled={pending}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-2 hover:border-ink/40 hover:text-ink"
            >
              {r.label}
            </button>
          ))}
          <button onClick={() => setState("idle")} className="px-1 text-xs text-muted hover:text-ink">
            {t.cancel}
          </button>
        </div>
      ) : (
        <button onClick={() => setState("asking")} className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-ink">
          {compact ? t.notForMe : t.notInterested}
        </button>
      )}
      {error && <span className="text-xs text-warn">{error}</span>}
    </div>
  );
}
