"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { QUICK, costAnswer, linkify } from "@/lib/help-shared";

type Msg = { role: "user" | "assistant"; content: string };
export type HelpPricing = { paywall: boolean; pro: number; premium: number; trialDays: number };

const T = defineT({
  en: {
    open: "Chat with Sara", close: "Close chat", title: "Sara", subtitle: "JobFitwise help · AI assistant", hello: "Hi, I'm Sara, JobFitwise's AI assistant! Ask me how JobFitwise works, or pick a question.",
    placeholder: "Type your question…", send: "Send", thinking: "Thinking…", ai: "Answers are written by AI and can be wrong. Never share passwords or personal ID numbers.",
    faq: "All FAQ", error: "Something went wrong. Try again, or read the FAQ.", restart: "Start over", nudge: "Questions? Ask Sara",
  },
  sv: {
    open: "Chatta med Sara", close: "Stäng chatten", title: "Sara", subtitle: "JobFitwise hjälp · AI-assistent", hello: "Hej, jag heter Sara och är JobFitwise AI-assistent! Fråga hur JobFitwise fungerar, eller välj en fråga.",
    placeholder: "Skriv din fråga…", send: "Skicka", thinking: "Tänker…", ai: "Svaren skrivs av AI och kan bli fel. Dela aldrig lösenord eller personnummer.",
    faq: "Alla vanliga frågor", error: "Något gick fel. Försök igen, eller läs vanliga frågor.", restart: "Börja om", nudge: "Frågor? Fråga Sara",
  },
});

const NUDGE_KEY = "fw_help_nudged";

function Answer({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  return (
    <>
      {linkify(text).map((p, i) =>
        "href" in p && p.href.startsWith("mailto:") ? (
          <a key={i} href={p.href} className="font-medium text-accent underline underline-offset-2">{p.text}</a>
        ) : "href" in p ? (
          <Link key={i} href={p.href} onClick={onNavigate} className="font-medium text-accent underline underline-offset-2">{p.text}</Link>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** The "?" help assistant: instant answers to common questions, and AI answers grounded in the help guide. */
export function HelpChat({ pricing, signedIn }: { pricing: HelpPricing; signedIn: boolean }) {
  const locale = useLocale();
  const t = T[locale];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tabbar, setTabbar] = useState(false);
  const [nudge, setNudge] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sit above the phone tab bar when the page has one.
  useEffect(() => { setTabbar(!!document.getElementById("app-tabbar")); }, [pathname]);

  // A one-time hint for first-time visitors who aren't signed in.
  useEffect(() => {
    if (signedIn) return;
    let seen = true;
    try { seen = !!localStorage.getItem(NUDGE_KEY); } catch { /* storage blocked */ }
    if (seen) return;
    const id = setTimeout(() => setNudge(true), 6000);
    return () => clearTimeout(id);
  }, [signedIn]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname?.startsWith("/admin")) return null;

  function toggle() {
    setOpen((o) => !o);
    if (nudge) setNudge(false);
    try { localStorage.setItem(NUDGE_KEY, "1"); } catch { /* storage blocked */ }
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function quick(i: number) {
    const item = QUICK[locale][i];
    const a = item.a || costAnswer(locale, pricing);
    setMsgs((m) => [...m, { role: "user", content: item.q }, { role: "assistant", content: a }]);
  }

  async function ask(e?: React.FormEvent) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q.slice(0, 1000) }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8) }),
      });
      const data = await res.json().catch(() => ({}));
      setMsgs([...next, { role: "assistant", content: res.ok && data.answer ? data.answer : (data.error || t.error) }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: t.error }]);
    } finally {
      setBusy(false);
    }
  }

  const bottom = tabbar ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6" : "bottom-5 sm:bottom-6";

  return (
    <div className={`fixed right-4 z-50 print:hidden sm:right-6 ${bottom}`}>
      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          className="absolute bottom-16 right-0 flex max-h-[min(36rem,calc(100dvh-9rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-line bg-accent px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-semibold text-accent">S</span>
              <div className="leading-tight">
                <p className="font-semibold">{t.title}</p>
                <p className="text-xs opacity-85">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {msgs.length > 0 && <button type="button" onClick={() => setMsgs([])} className="opacity-90 hover:opacity-100">{t.restart}</button>}
              <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="text-xl leading-none opacity-90 hover:opacity-100">×</button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-paper-2 px-3 py-2 text-ink">{t.hello}</div>
            {msgs.map((m, i) => (
              <div
                key={i}
                className={m.role === "user"
                  ? "ml-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-accent px-3 py-2 text-white"
                  : "max-w-[90%] whitespace-pre-line rounded-2xl rounded-tl-sm bg-paper-2 px-3 py-2 text-ink"}
              >
                {m.role === "assistant" ? <Answer text={m.content} onNavigate={() => setOpen(false)} /> : m.content}
              </div>
            ))}
            {busy && <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-paper-2 px-3 py-2 text-muted">{t.thinking}</div>}
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK[locale].map((x, i) => (
                  <button key={x.q} type="button" onClick={() => quick(i)}
                    className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-ink-2 hover:border-accent hover:text-accent">
                    {x.q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={ask} className="border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(); } }}
                rows={1}
                maxLength={1000}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <button type="submit" disabled={busy || !input.trim()}
                className="h-10 rounded-xl bg-accent px-4 text-sm font-medium text-white disabled:opacity-50">{t.send}</button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted">
              {t.ai} <Link href="/faq" onClick={() => setOpen(false)} className="underline">{t.faq}</Link>
            </p>
          </form>
        </div>
      )}

      {nudge && !open && (
        <button type="button" onClick={toggle}
          className="absolute bottom-16 right-0 whitespace-nowrap rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink shadow-lg">
          {t.nudge}
        </button>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? t.close : t.open}
        className={`flex h-14 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white shadow-xl transition hover:scale-105 ${open ? "w-14 text-2xl" : "px-5 text-base"}`}
      >
        {open ? "×" : (
          <>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            </svg>
            Sara
          </>
        )}
      </button>
    </div>
  );
}
