"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { LockedTeaser } from "@/components/billing/Upgrade";
import type { PublicSession } from "@/lib/interview";

const T = defineT({
  en: {
    title: "Practice interview",
    intro: "Five questions, one at a time, like the real thing. Write your answer as you would say it. You get a score and feedback after each answer, and an interview readiness score at the end.",
    start: "Start practice interview",
    again: "Practise again",
    starting: "Getting the interviewer ready…",
    lockedTitle: "Practise with an AI interviewer",
    locked: "Premium lets you practise with an interviewer for this exact job: feedback on every answer, a stronger version of what you said and an interview readiness score.",
    q: (i: number, n: number) => `Question ${i} of ${n}`,
    placeholder: "Type your answer as you would say it in the interview…",
    send: "Send answer",
    scoring: "Scoring your answer…",
    short: "Give a fuller answer, at least a couple of sentences.",
    score: "Score",
    stronger: "A stronger answer",
    readiness: "Interview readiness",
    good: "What went well",
    improve: "Practise before the real interview",
    failed: "Something went wrong. Try again.",
    youSaid: "Your answer",
  },
  sv: {
    title: "Övningsintervju",
    intro: "Fem frågor, en i taget, som på riktigt. Skriv ditt svar som du skulle säga det. Du får poäng och feedback efter varje svar och en beredskapspoäng i slutet.",
    start: "Starta övningsintervjun",
    again: "Öva igen",
    starting: "Gör intervjuaren redo…",
    lockedTitle: "Öva med en AI-intervjuare",
    locked: "Med Premium övar du med en intervjuare för just det här jobbet: feedback på varje svar, en starkare version av det du sa och en beredskapspoäng.",
    q: (i: number, n: number) => `Fråga ${i} av ${n}`,
    placeholder: "Skriv ditt svar som du skulle säga det på intervjun…",
    send: "Skicka svar",
    scoring: "Bedömer ditt svar…",
    short: "Ge ett fylligare svar, minst ett par meningar.",
    score: "Poäng",
    stronger: "Ett starkare svar",
    readiness: "Intervjuberedskap",
    good: "Det här gick bra",
    improve: "Öva på innan den riktiga intervjun",
    failed: "Något gick fel. Försök igen.",
    youSaid: "Ditt svar",
  },
});

function Dots({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${score} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-2 w-2 rounded-full ${i <= score ? "bg-accent" : "bg-line"}`} />)}
    </span>
  );
}

export function MockInterview({ jobId, allowed, initial }: { jobId: string; allowed: boolean; initial: PublicSession | null }) {
  const t = T[useLocale()];
  const [session, setSession] = useState(initial);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<"start" | "answer" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (url: string, body: unknown, kind: "start" | "answer") => {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t.failed);
      setSession(data.session);
      if (kind === "answer") setAnswer("");
    } catch (e) {
      setError((e as Error).message || t.failed);
    } finally {
      setBusy(null);
    }
  };

  const start = () => call("/api/interview/sessions", { job_id: jobId }, "start");
  const send = () => {
    if (!session) return;
    if (answer.trim().split(/\s+/).length < 5) return setError(t.short);
    call(`/api/interview/sessions/${session.id}/answer`, { answer, index: session.turns.length }, "answer");
  };

  const spin = (text: string) => (
    <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />{text}
    </p>
  );

  const startButton = (label: string) => busy === "start" ? spin(t.starting) : (
    <button type="button" onClick={start} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">{label}</button>
  );

  return (
    <section id="practice" aria-labelledby="mock-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="mock-heading" className="text-xl font-semibold">{t.title}</h2>

      {!allowed ? (
        <div className="mt-3"><LockedTeaser plan="premium" title={t.lockedTitle} body={t.locked} /></div>
      ) : !session ? (
        <>
          <p className="mt-1.5 text-sm text-ink-2">{t.intro}</p>
          {startButton(t.start)}
        </>
      ) : (
        <>
          {/* Answered questions with their feedback */}
          <ol className="mt-4 space-y-4">
            {session.turns.map((turn, i) => (
              <li key={i} className="rounded-xl border border-line p-4">
                <p className="text-xs text-muted">{t.q(i + 1, session.questions.length)}</p>
                <p className="mt-1 font-medium">{session.questions[i].question}</p>
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-ink-2">{t.youSaid}</summary>
                  <p className="mt-1 whitespace-pre-line text-ink-2">{turn.answer}</p>
                </details>
                <p className="mt-3 flex items-center gap-2 text-sm"><span className="font-medium">{t.score}</span> <Dots score={turn.score} /></p>
                {turn.feedback && <p className="mt-1.5 text-sm">{turn.feedback}</p>}
                {turn.stronger && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-medium text-accent">{t.stronger}</summary>
                    <p className="mt-1 whitespace-pre-line rounded-lg bg-accent-soft/50 p-3 leading-relaxed">{turn.stronger}</p>
                  </details>
                )}
              </li>
            ))}
          </ol>

          {!session.done ? (
            <div className="mt-5 rounded-xl border-2 border-accent/40 p-4">
              <p className="text-xs font-medium text-accent">{t.q(session.turns.length + 1, session.questions.length)}</p>
              <p className="mt-1 text-lg font-medium leading-snug">{session.questions[session.turns.length].question}</p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                maxLength={4000}
                placeholder={t.placeholder}
                disabled={busy === "answer"}
                aria-label={t.placeholder}
                className="mt-3 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed"
              />
              {busy === "answer" ? spin(t.scoring) : (
                <button type="button" onClick={send} disabled={!answer.trim()} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-40">{t.send}</button>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-accent-soft/60 p-5">
              <p className="text-sm text-ink-2">{t.readiness}</p>
              <p className="font-display text-5xl tabular-nums">{session.score}%</p>
              {session.summary?.summary && <p className="mt-2">{session.summary.summary}</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {!!session.summary?.strengths.length && (
                  <div>
                    <h3 className="text-sm font-semibold">{t.good}</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm marker:text-accent">{session.summary.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
                {!!session.summary?.improve.length && (
                  <div>
                    <h3 className="text-sm font-semibold">{t.improve}</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm marker:text-accent">{session.summary.improve.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
              </div>
              {startButton(t.again)}
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-warn">{error}</p>}
    </section>
  );
}
