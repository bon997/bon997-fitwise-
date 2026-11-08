"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { SUPPLY_CHAIN_PRESET, maxPriority, type PriorityMatch, type PriorityRule } from "@/lib/priorities";

const T = defineT({
  en: {
    title: "My priorities",
    intro: "Give points to what matters most to you. Jobs are then sorted by the total, highest first, and each job shows which priorities it meets.",
    preset: "Use the supply chain & logistics list",
    presetNote: "Logistics/Supply Chain Coordinator, SAP, Power BI, Excel, procurement, transport planning, warehouse admin, English, hybrid — with Swedish wording.",
    add: "+ Add a priority",
    label: "Priority",
    points: "Points",
    match: "Look for it",
    words: "Words to look for (comma-separated, Swedish and English)",
    wordsAuto: "Found automatically",
    m: { title: "In the job title", text: "Anywhere in the ad", english: "Ad in English", remote: "Remote or hybrid" } as Record<PriorityMatch, string>,
    remove: (l: string) => `Remove ${l}`,
    max: (n: number) => `A job can reach at most ${n} points.`,
    save: "Save priorities",
    saving: "Saving…",
    saved: "Saved. The Jobs page now sorts by your priorities.",
    cleared: "Priorities removed.",
    failed: "Couldn't save. Check that every priority has a name.",
    clear: "Remove all",
  },
  sv: {
    title: "Mina prioriteringar",
    intro: "Ge poäng åt det som är viktigast för dig. Jobben sorteras sedan efter summan, högst först, och varje jobb visar vilka prioriteringar det uppfyller.",
    preset: "Använd listan för supply chain & logistik",
    presetNote: "Logistik-/Supply Chain-koordinator, SAP, Power BI, Excel, inköp, transportplanering, lageradministration, engelska, hybrid — med svenska ord.",
    add: "+ Lägg till en prioritering",
    label: "Prioritering",
    points: "Poäng",
    match: "Leta efter det",
    words: "Ord att leta efter (kommaseparerade, svenska och engelska)",
    wordsAuto: "Hittas automatiskt",
    m: { title: "I jobbtiteln", text: "Var som helst i annonsen", english: "Annons på engelska", remote: "Distans eller hybrid" },
    remove: (l: string) => `Ta bort ${l}`,
    max: (n: number) => `Ett jobb kan få högst ${n} poäng.`,
    save: "Spara prioriteringar",
    saving: "Sparar…",
    saved: "Sparat. Jobbsidan sorterar nu efter dina prioriteringar.",
    cleared: "Prioriteringarna togs bort.",
    failed: "Kunde inte spara. Kontrollera att varje prioritering har ett namn.",
    clear: "Ta bort alla",
  },
});

type Row = PriorityRule & { key: number; wordsText: string };
let nextKey = 1;
const toRow = (r: PriorityRule): Row => ({ ...r, key: nextKey++, wordsText: r.terms.join(", ") });
const field = "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-ink/40";

export function PrioritiesEditor({ initial }: { initial: PriorityRule[] }) {
  const t = T[useLocale()];
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const rules = (): PriorityRule[] =>
    rows.map(({ label, points, match, wordsText }) => ({
      label: label.trim(),
      points: Math.round(Number(points) || 0),
      match,
      terms: match === "title" || match === "text"
        ? wordsText.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean).slice(0, 20)
        : [],
    }));

  const save = (list: PriorityRule[]) =>
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { priorities: list } }),
      });
      if (!res.ok) return setMsg({ ok: false, text: t.failed });
      setMsg({ ok: true, text: list.length ? t.saved : t.cleared });
      router.refresh();
    });

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="priorities-heading">
      <h2 id="priorities-heading" className="text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-ink-2">{t.intro}</p>

      {rows.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-line p-4">
          <button type="button" onClick={() => setRows(SUPPLY_CHAIN_PRESET.map(toRow))}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper hover:opacity-90">
            {t.preset}
          </button>
          <p className="mt-2 text-xs text-muted">{t.presetNote}</p>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const auto = r.match === "english" || r.match === "remote";
            return (
              <li key={r.key} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.4fr_80px_1.2fr_auto] sm:items-end">
                <label className="text-xs">
                  <span className="text-muted">{t.label}</span>
                  <input value={r.label} maxLength={60} onChange={(e) => update(r.key, { label: e.target.value })} className={`mt-1 ${field}`} />
                </label>
                <label className="text-xs">
                  <span className="text-muted">{t.points}</span>
                  <input type="number" min={-50} max={100} step={5} value={r.points}
                    onChange={(e) => update(r.key, { points: Number(e.target.value) })} className={`mt-1 ${field} tabular-nums`} />
                </label>
                <label className="text-xs">
                  <span className="text-muted">{t.match}</span>
                  <select value={r.match} onChange={(e) => update(r.key, { match: e.target.value as PriorityMatch })} className={`mt-1 ${field}`}>
                    {(Object.keys(t.m) as PriorityMatch[]).map((m) => <option key={m} value={m}>{t.m[m]}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={t.remove(r.label || "—")}
                  className="h-9 w-9 justify-self-end rounded-full text-lg text-muted hover:bg-paper hover:text-ink">×</button>
                <label className="text-xs sm:col-span-4">
                  <span className="text-muted">{auto ? t.wordsAuto : t.words}</span>
                  {!auto && (
                    <input value={r.wordsText} onChange={(e) => update(r.key, { wordsText: e.target.value })}
                      placeholder={r.label.toLowerCase()} className={`mt-1 ${field}`} />
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRows((rs) => [...rs, toRow({ label: "", points: 10, match: "text", terms: [] })])}
          className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink/40">
          {t.add}
        </button>
        {rows.length > 0 && <span className="text-xs text-muted">{t.max(maxPriority(rules()))}</span>}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="button" disabled={pending} onClick={() => save(rules())}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60">
          {pending ? t.saving : t.save}
        </button>
        {initial.length > 0 && (
          <button type="button" disabled={pending} onClick={() => { setRows([]); save([]); }}
            className="text-sm text-muted underline underline-offset-2 hover:text-ink">
            {t.clear}
          </button>
        )}
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-accent" : "text-warn"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
