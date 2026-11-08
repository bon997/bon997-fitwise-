"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import {
  CATEGORIES, CATEGORY_LABEL, CITIES, CITY_LABEL, COUNTS, FREQUENCIES, MIN_MATCHES, RADII,
  alertSummary, type AlertSettings as Settings, type Category,
} from "@/lib/alert-settings";

const T = defineT({
  en: {
    title: "Job alerts",
    intro: "We read your CV profile, score new jobs against it and email you the best ones on your schedule.",
    email: "Send job alerts to my email",
    to: "Alerts go to",
    toNote: "your confirmed account address.",
    freq: "How often would you like to receive jobs?",
    f: { daily: "Daily", weekly: "Weekly", monthly: "Monthly" },
    fNote: { daily: "Every morning at 08:00", weekly: "Mondays at 08:00", monthly: "The 1st of each month at 08:00" },
    count: "Number of jobs per alert",
    jobs: (n: number) => `${n} jobs`,
    cats: "Job categories",
    catsNote: "None ticked = all jobs that match your profile.",
    loc: "Location",
    city: "City",
    radius: "Search radius",
    radiusOff: "Not needed for all of Sweden",
    remoteNote: "Remote jobs are always included.",
    match: "Only send jobs with at least",
    pct: (n: number) => `${n}%+ match`,
    summary: "What you'll get",
    save: "Save alert settings",
    saving: "Saving…",
    saved: "Saved.",
    failed: "Couldn't save. Try again.",
    preview: "Preview my alert",
    previewing: "Finding jobs…",
    previewNone: "No recent jobs match these settings yet. Try a lower match, a bigger radius or fewer categories.",
    previewIntro: (n: number) => `Your alert would contain ${n} job${n === 1 ? "" : "s"} today:`,
    away: (n: number) => `${n} km`,
    by: (d: string) => `apply by ${d}`,
    remote: "Remote",
    noProfile: "Add your CV or a few skills first, so we have something to match jobs against.",
    addCv: "Add my CV",
    off: "Job alert emails aren't switched on for JobFitwise yet. Your settings are saved for when they are.",
    confirm: "Confirm your email address to get alerts. We sent a link when you signed up.",
    send: "Send a new link",
    sent: "Sent. Check your inbox (and spam folder).",
  },
  sv: {
    title: "Jobbtips",
    intro: "Vi läser din CV-profil, matchar nya jobb mot den och mejlar de bästa enligt ditt schema.",
    email: "Skicka jobbtips till min e-post",
    to: "Jobbtipsen går till",
    toNote: "din bekräftade kontoadress.",
    freq: "Hur ofta vill du få jobb?",
    f: { daily: "Dagligen", weekly: "Varje vecka", monthly: "Varje månad" },
    fNote: { daily: "Varje morgon kl. 08:00", weekly: "Måndagar kl. 08:00", monthly: "Den 1:a varje månad kl. 08:00" },
    count: "Antal jobb per utskick",
    jobs: (n: number) => `${n} jobb`,
    cats: "Jobbkategorier",
    catsNote: "Ingen vald = alla jobb som matchar din profil.",
    loc: "Plats",
    city: "Stad",
    radius: "Sökradie",
    radiusOff: "Behövs inte för hela Sverige",
    remoteNote: "Distansjobb tas alltid med.",
    match: "Skicka bara jobb med minst",
    pct: (n: number) => `${n} %+ matchning`,
    summary: "Det här får du",
    save: "Spara inställningar",
    saving: "Sparar…",
    saved: "Sparat.",
    failed: "Kunde inte spara. Försök igen.",
    preview: "Förhandsgranska mitt utskick",
    previewing: "Letar jobb…",
    previewNone: "Inga nya jobb matchar inställningarna än. Prova lägre matchning, större radie eller färre kategorier.",
    previewIntro: (n: number) => `Ditt utskick skulle i dag innehålla ${n} jobb:`,
    away: (n: number) => `${n} km`,
    by: (d: string) => `sök senast ${d}`,
    remote: "Distans",
    noProfile: "Lägg till ditt CV eller några kompetenser först, så att vi har något att matcha jobben mot.",
    addCv: "Lägg till mitt CV",
    off: "Mejl med jobbtips är inte påslaget på JobFitwise än. Dina inställningar sparas till dess.",
    confirm: "Bekräfta din e-postadress för att få jobbtips. Vi skickade en länk när du registrerade dig.",
    send: "Skicka en ny länk",
    sent: "Skickat. Titta i inkorgen (och skräpposten).",
  },
});

type PreviewJob = { id: string; title: string; company: string; location: string | null; remote: boolean; salary: string | null; deadline: string | null; score: number; km: number | null };

/** A row of radio "pills": one fieldset, real radio inputs, so keyboard and screen readers work. */
function Choice<V extends string | number>({ name, legend, value, options, label, onChange, disabled, note }: {
  name: string; legend: string; value: V; options: readonly V[]; label: (v: V) => string; onChange: (v: V) => void; disabled?: boolean; note?: string;
}) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-50">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o)} className="cursor-pointer">
            <input type="radio" name={name} value={String(o)} checked={value === o} onChange={() => onChange(o)} className="peer sr-only" />
            <span className="inline-block rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              {label(o)}
            </span>
          </label>
        ))}
      </div>
      {note && <p className="mt-1.5 text-xs text-muted">{note}</p>}
    </fieldset>
  );
}

export function AlertSettings({ initial, settings: initialSettings, email, verified, emailOn, hasProfile }: {
  initial: boolean; settings: Settings; email: string; verified: boolean; emailOn: boolean; hasProfile: boolean;
}) {
  const locale = useLocale();
  const t = T[locale];
  const [on, setOn] = useState(initial);
  const [s, setS] = useState<Settings>(initialSettings);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<"idle" | "busy" | "sent" | string>("idle");
  const [preview, setPreview] = useState<PreviewJob[] | null>(null);
  const [saving, startSave] = useTransition();
  const [previewing, startPreview] = useTransition();

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setS((x) => ({ ...x, [k]: v })); setStatus(null); setPreview(null); };
  const toggleCat = (c: Category) => set("categories", s.categories.includes(c) ? s.categories.filter((x) => x !== c) : [...s.categories, c]);
  const day = (d: string) => new Date(d).toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });

  const save = () =>
    startSave(async () => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_alerts: on, preferences: { alerts: s } }),
      }).catch(() => null);
      setStatus(res?.ok ? { ok: true, text: t.saved } : { ok: false, text: t.failed });
    });

  const runPreview = () =>
    startPreview(async () => {
      const res = await fetch("/api/alerts/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).catch(() => null);
      const body = await res?.json().catch(() => null);
      setPreview(res?.ok ? (body?.jobs ?? []) : []);
    });

  const resend = async () => {
    setLink("busy");
    const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    setLink(res?.ok ? "sent" : (body?.error ?? t.failed));
  };

  return (
    <section aria-labelledby="alerts-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="alerts-heading" className="text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-ink-2">{t.intro}</p>

      {!hasProfile && (
        <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
          {t.noProfile} <a href="#top" className="font-medium underline underline-offset-2">{t.addCv}</a>
        </p>
      )}

      {/* Email */}
      <div className="mt-5 rounded-xl bg-paper px-4 py-3">
        <label className="flex items-start gap-3 text-sm">
          <input id="job-alerts" type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); setStatus(null); }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
          <span className="font-medium">{t.email}</span>
        </label>
        <p className="mt-1.5 pl-8 text-xs text-muted">{t.to} <strong className="text-ink-2">{email}</strong> — {t.toNote}</p>
        {!emailOn ? (
          <p className="mt-2 pl-8 text-xs text-muted">{t.off}</p>
        ) : !verified && on && (
          <div className="mt-2 ml-8 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
            <p>{t.confirm}</p>
            {link === "sent" ? <p className="mt-1 font-medium">{t.sent}</p> : (
              <>
                <button type="button" onClick={resend} disabled={link === "busy"} className="mt-1 font-medium underline underline-offset-2 disabled:opacity-60">{t.send}</button>
                {link !== "idle" && link !== "busy" && <p className="mt-1">{link}</p>}
              </>
            )}
          </div>
        )}
      </div>

      <div className={`mt-6 space-y-6 ${on ? "" : "opacity-60"}`}>
        <Choice name="alert-frequency" legend={t.freq} value={s.frequency} options={FREQUENCIES} label={(f) => t.f[f]} onChange={(v) => set("frequency", v)} note={t.fNote[s.frequency]} />
        <Choice name="alert-count" legend={t.count} value={s.count} options={COUNTS} label={t.jobs} onChange={(v) => set("count", v)} />

        <fieldset>
          <legend className="text-sm font-medium">{t.cats}</legend>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.categories.includes(c)} onChange={() => toggleCat(c)} className="h-4 w-4 accent-[var(--color-accent)]" />
                {CATEGORY_LABEL[locale][c]}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">{t.catsNote}</p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">{t.loc}</legend>
          <label className="mt-2 block max-w-xs text-sm">
            <span className="text-xs text-muted">{t.city}</span>
            <select value={s.city} onChange={(e) => set("city", e.target.value as Settings["city"])}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
              {CITIES.map((c) => <option key={c} value={c}>{c === "sweden" ? (locale === "sv" ? "Hela Sverige" : "Sweden-wide") : CITY_LABEL[locale][c]}</option>)}
            </select>
          </label>
          <div className="mt-3">
            <Choice name="alert-radius" legend={t.radius} value={s.radius_km} options={RADII} label={(n) => `${n} km`}
              onChange={(v) => set("radius_km", v)} disabled={s.city === "sweden"} note={s.city === "sweden" ? t.radiusOff : t.remoteNote} />
          </div>
        </fieldset>

        <Choice name="alert-match" legend={t.match} value={s.min_match} options={MIN_MATCHES} label={t.pct} onChange={(v) => set("min_match", v)} />
      </div>

      <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t.summary}</p>
        <p className="mt-1 text-sm">{alertSummary(s, locale)}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60">
          {saving ? t.saving : t.save}
        </button>
        {hasProfile && (
          <button type="button" onClick={runPreview} disabled={previewing}
            className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-ink/40 disabled:opacity-60">
            {previewing ? t.previewing : t.preview}
          </button>
        )}
        <p aria-live="polite" className={`text-sm ${status?.ok ? "text-accent" : "text-warn"}`}>{status?.text}</p>
      </div>

      {preview && (
        <div className="mt-5 border-t border-line pt-4" aria-live="polite">
          {preview.length === 0 ? <p className="text-sm text-muted">{t.previewNone}</p> : (
            <>
              <p className="text-sm text-ink-2">{t.previewIntro(preview.length)}</p>
              <ul className="mt-3 divide-y divide-line">
                {preview.map((j) => (
                  <li key={j.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/jobs/${j.id}`} className="block truncate text-sm font-medium hover:underline">{j.title}</Link>
                      <p className="truncate text-xs text-muted">
                        {[j.company, j.location, j.remote ? t.remote : null, j.km != null ? t.away(j.km) : null, j.salary, j.deadline ? t.by(day(j.deadline)) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">{j.score}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
