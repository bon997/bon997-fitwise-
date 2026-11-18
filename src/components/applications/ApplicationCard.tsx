"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { labels } from "@/lib/format";
import { StatusSelect } from "@/components/dashboard/StatusSelect";

const T = defineT({
  en: {
    applied: "Applied",
    saved: "Saved",
    interview: "Interview",
    nextStep: "Next step",
    nextStepHint: "e.g. Follow up on Friday",
    notes: "Private notes",
    notesHint: "Contact person, salary discussed, what to prepare…",
    save: "Save notes",
    saved2: "Saved",
    failed: "Couldn't save. Try again.",
    timeline: "Timeline",
    hide: "Hide timeline",
    fit: "fit",
    details: "Interview date, next step and notes",
    hasNotes: "Has notes",
    next: "Next:",
    prepare: "Prepare for the interview →",
  },
  sv: {
    applied: "Sökt",
    saved: "Sparad",
    interview: "Intervju",
    nextStep: "Nästa steg",
    nextStepHint: "t.ex. Följ upp på fredag",
    notes: "Privata anteckningar",
    notesHint: "Kontaktperson, lön som diskuterats, vad du ska förbereda…",
    save: "Spara anteckningar",
    saved2: "Sparat",
    failed: "Kunde inte spara. Försök igen.",
    timeline: "Tidslinje",
    hide: "Dölj tidslinje",
    fit: "matchning",
    details: "Intervjudatum, nästa steg och anteckningar",
    hasNotes: "Har anteckningar",
    next: "Nästa:",
    prepare: "Förbered dig för intervjun →",
  },
});

export type CardApplication = {
  id: string;
  status: string;
  notes: string | null;
  next_step: string | null;
  applied_at: string | null;
  created_at: string;
  interview_at: string | null;
  job: { id: string; title: string; company: string; location: string | null };
  fit_score: number | null;
  events: { status: string; at: string }[];
};

const TZ = "Europe/Stockholm";

/** "2026-11-18T13:00" in Stockholm time, for a datetime-local input (same on server and browser). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function formatDay(iso: string, locale: string, withTime = false) {
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

export function ApplicationCard({ app }: { app: CardApplication }) {
  const locale = useLocale();
  const t = T[locale];
  const router = useRouter();
  const [notes, setNotes] = useState(app.notes ?? "");
  const [nextStep, setNextStep] = useState(app.next_step ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [pending, start] = useTransition();

  const patch = (body: Record<string, unknown>, okText?: string) =>
    start(async () => {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMsg(res.ok ? (okText ? { ok: true, text: okText } : null) : { ok: false, text: t.failed });
      if (res.ok) router.refresh();
    });

  const status = labels(locale).status;

  return (
    <li className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/jobs/${app.job.id}`} className="block font-semibold hover:underline">{app.job.title}</Link>
          <p className="text-sm text-ink-2">
            {app.job.company}
            {app.job.location ? ` · ${app.job.location}` : ""}
            {app.fit_score != null && <span className="text-accent"> · {app.fit_score} {t.fit}</span>}
          </p>
          <p className="mt-1 text-xs text-muted">
            {app.applied_at ? `${t.applied} ${formatDay(app.applied_at, locale)}` : `${t.saved} ${formatDay(app.created_at, locale)}`}
            {app.interview_at && <> · <span className="font-medium text-ink">{t.interview} {formatDay(app.interview_at, locale, true)}</span></>}
          </p>
        </div>
        <StatusSelect id={app.id} status={app.status} label={app.job.title} />
      </div>

      {(app.next_step || app.notes) && (
        <p className="mt-2 text-sm text-ink-2">
          {app.next_step && <><span className="font-medium text-ink">{t.next}</span> {app.next_step}</>}
          {app.next_step && app.notes && " · "}
          {app.notes && <span className="text-muted">{t.hasNotes}</span>}
        </p>
      )}

      {(app.status === "interviewing" || app.interview_at) && app.status !== "rejected" && app.status !== "withdrawn" && (
        <Link href={`/jobs/${app.job.id}/interview`} className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper hover:opacity-90">
          {t.prepare}
        </Link>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-accent">{t.details}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-2">
            {t.interview}
            <input
              type="datetime-local"
              defaultValue={toLocalInput(app.interview_at)}
              onChange={(e) => patch({ interview_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-ink-2">
            {t.nextStep}
            <input
              value={nextStep}
              maxLength={200}
              placeholder={t.nextStepHint}
              onChange={(e) => setNextStep(e.target.value)}
              onBlur={() => nextStep !== (app.next_step ?? "") && patch({ next_step: nextStep || null })}
              className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="mt-3 block text-xs font-medium text-ink-2">
          {t.notes}
          <textarea
            value={notes}
            maxLength={5000}
            rows={3}
            placeholder={t.notesHint}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal"
          />
          </label>
          <button
            type="button"
            disabled={pending || notes === (app.notes ?? "")}
            onClick={() => patch({ notes: notes || null }, t.saved2)}
            className="mt-2 rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-paper disabled:opacity-40"
          >
            {t.save}
          </button>
      </details>

      {msg && <p role="status" className={`mt-2 text-xs ${msg.ok ? "text-accent" : "text-warn"}`}>{msg.text}</p>}

      {app.events.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <button type="button" onClick={() => setShowTimeline((v) => !v)} className="text-xs font-medium text-ink-2 hover:text-ink" aria-expanded={showTimeline}>
            {showTimeline ? t.hide : `${t.timeline} (${app.events.length})`}
          </button>
          {showTimeline && (
            <ol className="mt-2 space-y-1.5 border-l-2 border-accent-soft pl-4">
              {app.events.map((e, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{status[e.status] ?? e.status}</span>
                  <span className="text-muted"> · {formatDay(e.at, locale, true)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

const MT = defineT({
  en: { mark: "Mark as applied", failed: "Couldn't update. Try again." },
  sv: { mark: "Markera som sökt", failed: "Kunde inte uppdatera. Försök igen." },
});

/** For a saved job that isn't in the tracker yet. */
export function MarkAppliedButton({ jobId }: { jobId: string }) {
  const t = MT[useLocale()];
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-2">
      {failed && <span className="text-xs text-warn">{t.failed}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await fetch("/api/applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ job_id: jobId, status: "applied" }),
            });
            setFailed(!res.ok && res.status !== 409);
            if (res.ok || res.status === 409) router.refresh();
          })
        }
        className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-ink disabled:opacity-50"
      >
        {t.mark}
      </button>
    </span>
  );
}
