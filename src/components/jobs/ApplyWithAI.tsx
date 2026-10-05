"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  jobId: string;
  applyUrl: string | null;
  existingLetter: string | null;
  application: { id: string; status: string } | null;
};

/**
 * "Apply with AI": draft a cover letter grounded in the user's resume,
 * let them edit it, then mark the job as applied (it lands in the tracker).
 */
export function ApplyWithAI({ jobId, applyUrl, existingLetter, application }: Props) {
  const router = useRouter();
  const [letter, setLetter] = useState(existingLetter ?? "");
  const [tone, setTone] = useState("professional");
  const [notes, setNotes] = useState("");
  const [app, setApp] = useState(application);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"gen" | "save" | "apply" | null>(null);

  const go = (which: typeof busy, fn: () => Promise<void>) =>
    start(async () => {
      setBusy(which);
      setMsg(null);
      try {
        await fn();
      } catch (e) {
        setMsg({ kind: "err", text: (e as Error).message });
      } finally {
        setBusy(null);
      }
    });

  const json = async (res: Response) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Something went wrong");
    return body;
  };

  const generate = () =>
    go("gen", async () => {
      const body = await json(
        await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId, tone, notes: notes || undefined }),
        }),
      );
      setLetter(body.cover_letter);
      if (body.application) setApp(body.application);
      setMsg({ kind: "ok", text: "Draft ready. Read it through and make it yours." });
    });

  const ensureApplication = async (status?: string) => {
    if (app) {
      const body = await json(
        await fetch(`/api/applications/${app.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cover_letter: letter || null, ...(status ? { status } : {}) }),
        }),
      );
      setApp({ id: body.application.id, status: body.application.status });
    } else {
      const body = await json(
        await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId, status: status ?? "draft", cover_letter: letter || undefined }),
        }),
      );
      setApp({ id: body.application.id, status: body.application.status });
    }
    router.refresh();
  };

  const save = () => go("save", async () => { await ensureApplication(); setMsg({ kind: "ok", text: "Saved to your tracker as a draft." }); });
  const markApplied = () => go("apply", async () => { await ensureApplication("applied"); setMsg({ kind: "ok", text: "Marked as applied. Track it on your dashboard." }); });

  const copy = async () => {
    await navigator.clipboard.writeText(letter);
    setMsg({ kind: "ok", text: "Copied to clipboard." });
  };

  const applied = app && app.status !== "draft";

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="apply-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="apply-heading" className="text-lg font-semibold">Apply with AI</h2>
        {app && (
          <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-medium capitalize text-ink-2">{app.status}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-2">
        We draft a cover letter from your real experience and this job&apos;s requirements. Nothing is sent until you send it.
      </p>

      <div className="mt-4 grid gap-3">
        <select value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Tone"
          className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
          <option value="professional">Professional</option>
          <option value="warm">Warm</option>
          <option value="concise">Concise</option>
        </select>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000}
          placeholder="Anything to emphasize? (optional)" aria-label="Notes for the letter"
          className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40" />
      </div>

      <button onClick={generate} disabled={pending}
        className="mt-3 w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60 sm:w-auto">
        {busy === "gen" ? "Writing your letter…" : letter ? "Write a new draft" : "Draft my cover letter"}
      </button>

      {letter && (
        <>
          <label htmlFor="letter" className="mt-5 block text-xs font-medium text-muted">Your cover letter (editable)</label>
          <textarea id="letter" value={letter} onChange={(e) => setLetter(e.target.value)} rows={14}
            className="mt-1.5 w-full rounded-xl border border-line bg-paper/40 p-4 text-sm leading-relaxed outline-none focus:border-ink/40" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copy} className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">Copy</button>
            <button onClick={save} disabled={pending} className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
          </div>
        </>
      )}

      <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center">
        {applyUrl && (
          <a href={applyUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-full bg-ink px-5 py-2.5 text-center text-sm font-medium text-paper hover:bg-ink-2">
            Open application page ↗
          </a>
        )}
        <button onClick={markApplied} disabled={pending || Boolean(applied)}
          className="rounded-full border border-ink/20 px-5 py-2.5 text-sm hover:border-ink/50 disabled:opacity-60">
          {applied ? "✓ Marked as applied" : busy === "apply" ? "Saving…" : "I've applied"}
        </button>
      </div>

      {msg && (
        <p role="status" className={`mt-3 text-sm ${msg.kind === "ok" ? "text-accent" : "text-warn"}`}>{msg.text}</p>
      )}
    </section>
  );
}
