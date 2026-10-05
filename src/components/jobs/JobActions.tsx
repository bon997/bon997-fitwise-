"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  { value: "not_my_role", label: "Not my kind of role" },
  { value: "wrong_location", label: "Wrong location" },
  { value: "salary_too_low", label: "Salary too low" },
  { value: "wrong_seniority", label: "Wrong level" },
  { value: "company", label: "Hide this company" },
  { value: "other", label: "Other" },
];

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error ?? "Something went wrong");
}

/** Save and "Not interested" buttons. Every click also teaches the "For you" ranking. */
export function JobActions({ jobId, saved: initialSaved, compact = false }: { jobId: string; saved: boolean; compact?: boolean }) {
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
      if (saved) await call(`/api/saved-jobs?job_id=${jobId}`, { method: "DELETE" });
      else await call("/api/saved-jobs", { method: "POST", body: JSON.stringify({ job_id: jobId }) });
      setSaved(!saved);
      router.refresh();
    });

  const dismiss = (reason: string) =>
    run(async () => {
      await call(`/api/jobs/${jobId}/dismiss`, { method: "POST", body: JSON.stringify({ reason }) });
      setState("dismissed");
    });

  const undo = () =>
    run(async () => {
      await call(`/api/jobs/${jobId}/dismiss`, { method: "DELETE" });
      setState("idle");
    });

  if (state === "dismissed") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted">
        Hidden. We&apos;ll show fewer jobs like this.
        <button onClick={undo} disabled={pending} className="font-medium text-ink underline underline-offset-2">
          Undo
        </button>
        <button onClick={() => router.refresh()} className="text-xs text-muted hover:text-ink">
          Refresh list
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
        {saved ? "★ Saved" : "☆ Save"}
      </button>
      {state === "asking" ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Why not interested?">
          {REASONS.map((r) => (
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
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setState("asking")} className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-ink">
          {compact ? "Not for me" : "Not interested"}
        </button>
      )}
      {error && <span className="text-xs text-warn">{error}</span>}
    </div>
  );
}
