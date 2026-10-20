"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT, type Locale } from "@/i18n/config";
import { labels } from "@/lib/format";

const T = defineT({
  en: {
    error: "Something went wrong",
    ready: "Draft ready. Read it through and make it yours.",
    savedDraft: "Saved to your tracker as a draft.",
    marked: "Marked as applied. Track it on your dashboard.",
    copied: "Copied to clipboard.",
    title: "Apply with AI",
    intro: "We draft a cover letter from your real experience and this job's requirements. Nothing is sent until you send it.",
    tone: "Tone",
    professional: "Professional",
    warm: "Warm",
    concise: "Concise",
    language: "Letter language",
    notesPh: "Anything to emphasize? (optional)",
    notesLabel: "Notes for the letter",
    writing: "Writing your letter…",
    newDraft: "Write a new draft",
    draft: "Draft my cover letter",
    yourLetter: "Your cover letter (editable)",
    copy: "Copy",
    saving: "Saving…",
    save: "Save draft",
    open: "Open application page ↗",
    applied: "✓ Marked as applied",
    iApplied: "I've applied",
  },
  sv: {
    error: "Något gick fel",
    ready: "Utkastet är klart. Läs igenom det och gör det till ditt eget.",
    savedDraft: "Sparat i din översikt som utkast.",
    marked: "Markerat som sökt. Följ det i din översikt.",
    copied: "Kopierat.",
    title: "Sök med AI",
    intro: "Vi skriver ett utkast till personligt brev utifrån din riktiga erfarenhet och jobbets krav. Inget skickas förrän du skickar det.",
    tone: "Ton",
    professional: "Professionell",
    warm: "Varm",
    concise: "Kortfattad",
    language: "Brevets språk",
    notesPh: "Något du vill lyfta fram? (valfritt)",
    notesLabel: "Anteckningar till brevet",
    writing: "Skriver ditt brev…",
    newDraft: "Skriv ett nytt utkast",
    draft: "Skriv mitt personliga brev",
    yourLetter: "Ditt personliga brev (redigerbart)",
    copy: "Kopiera",
    saving: "Sparar…",
    save: "Spara utkast",
    open: "Öppna ansökningssidan ↗",
    applied: "✓ Markerat som sökt",
    iApplied: "Jag har sökt",
  },
});

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
  const locale = useLocale();
  const t = T[locale];
  const router = useRouter();
  // Defaults to the site language; switch when the job ad is in the other language.
  const [language, setLanguage] = useState<Locale>(locale);
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
    if (!res.ok) throw new Error(body.error ?? t.error);
    return body;
  };

  const generate = () =>
    go("gen", async () => {
      const body = await json(
        await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId, tone, language, notes: notes || undefined }),
        }),
      );
      setLetter(body.cover_letter);
      if (body.application) setApp(body.application);
      setMsg({ kind: "ok", text: t.ready });
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

  const save = () => go("save", async () => { await ensureApplication(); setMsg({ kind: "ok", text: t.savedDraft }); });
  const markApplied = () => go("apply", async () => { await ensureApplication("applied"); setMsg({ kind: "ok", text: t.marked }); });

  const copy = async () => {
    await navigator.clipboard.writeText(letter);
    setMsg({ kind: "ok", text: t.copied });
  };

  const applied = app && app.status !== "draft";

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="apply-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="apply-heading" className="text-lg font-semibold">{t.title}</h2>
        {app && (
          <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-medium text-ink-2">{labels(locale).status[app.status] ?? app.status}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-2">
        {t.intro}
      </p>

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <select value={tone} onChange={(e) => setTone(e.target.value)} aria-label={t.tone}
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
            <option value="professional">{t.professional}</option>
            <option value="warm">{t.warm}</option>
            <option value="concise">{t.concise}</option>
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Locale)} aria-label={t.language}
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
            <option value="sv">🇸🇪 Svenska</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000}
          placeholder={t.notesPh} aria-label={t.notesLabel}
          className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40" />
      </div>

      <button onClick={generate} disabled={pending}
        className="mt-3 w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60 sm:w-auto">
        {busy === "gen" ? t.writing : letter ? t.newDraft : t.draft}
      </button>

      {letter && (
        <>
          <label htmlFor="letter" className="mt-5 block text-xs font-medium text-muted">{t.yourLetter}</label>
          <textarea id="letter" value={letter} onChange={(e) => setLetter(e.target.value)} rows={14}
            className="mt-1.5 w-full rounded-xl border border-line bg-paper/40 p-4 text-sm leading-relaxed outline-none focus:border-ink/40" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copy} className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">{t.copy}</button>
            <button onClick={save} disabled={pending} className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">
              {busy === "save" ? t.saving : t.save}
            </button>
          </div>
        </>
      )}

      <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center">
        {applyUrl && (
          <a href={applyUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-full bg-ink px-5 py-2.5 text-center text-sm font-medium text-paper hover:bg-ink-2">
            {t.open}
          </a>
        )}
        <button onClick={markApplied} disabled={pending || Boolean(applied)}
          className="rounded-full border border-ink/20 px-5 py-2.5 text-sm hover:border-ink/50 disabled:opacity-60">
          {applied ? t.applied : busy === "apply" ? t.saving : t.iApplied}
        </button>
      </div>

      {msg && (
        <p role="status" className={`mt-3 text-sm ${msg.kind === "ok" ? "text-accent" : "text-warn"}`}>{msg.text}</p>
      )}
    </section>
  );
}
