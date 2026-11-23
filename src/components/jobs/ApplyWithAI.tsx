"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT, type Locale } from "@/i18n/config";
import { labels } from "@/lib/format";
import { letterHasKeyword, type ApplicationPack } from "@/lib/application-pack-shared";

const T = defineT({
  en: {
    error: "Something went wrong",
    ready: "Draft ready. Read it through and make it yours.",
    savedDraft: "Saved to your tracker as a draft.",
    marked: "Marked as applied. Track it on your dashboard.",
    copied: "Copied to clipboard.",
    aiQ: "Will employers know it was written with AI?",
    title: "Cover letter with AI",
    intro: "A recruiter-style application pack: a cover letter tailored to this company, an analysis of the job's top requirements, an ATS keyword check and a short Swedish email to send with your CV. Nothing is sent until you send it.",
    achievementsLabel: "Key achievements with results (optional)",
    achievementsPh: "e.g. Cut stock-outs by 30% by re-planning safety stock; handled 120 suppliers in SAP MM",
    companyLabel: "Company mission, values and culture (optional)",
    companyPh: "Paste from the company's website (About us / Careers). The letter will connect to it.",
    working: "Writing your letter and analysis… about 30 seconds",
    analysis: "Recruiter analysis",
    reqs: "Top 5 requirements and how you match",
    m: { strong: "Strong match", partial: "Partly", gap: "Gap" } as Record<string, string>,
    tip: "In the interview",
    addNumber: "Add a number",
    ats: "ATS keywords",
    atsHint: "Checked against your letter as you edit it.",
    atsIn: (n: number, total: number) => `${n} of ${total} in your letter`,
    email: "Email to the recruiter (Swedish)",
    emailHint: "Send this with your CV and cover letter attached.",
    subject: "Subject",
    copyEmail: "Copy email",
    words: (n: number) => `${n} words`,
    tone: "Tone",
    professional: "Professional",
    warm: "Warm",
    concise: "Concise",
    language: "Letter language",
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
    aiQ: "Märker arbetsgivare att brevet skrevs med AI?",
    title: "Personligt brev med AI",
    intro: "Ett ansökningspaket som en rekryterare skulle göra det: ett personligt brev anpassat till företaget, en analys av jobbets viktigaste krav, en ATS-kontroll av nyckelord och ett kort mejl att skicka med ditt CV. Inget skickas förrän du skickar det.",
    achievementsLabel: "Viktiga resultat du uppnått (valfritt)",
    achievementsPh: "t.ex. Minskade bristsituationer med 30 % genom ny säkerhetslagerplanering; hanterade 120 leverantörer i SAP MM",
    companyLabel: "Företagets mission, värderingar och kultur (valfritt)",
    companyPh: "Klistra in från företagets webbplats (Om oss / Karriär). Brevet kopplar till det.",
    working: "Skriver ditt brev och din analys… ungefär 30 sekunder",
    analysis: "Rekryterarens analys",
    reqs: "De 5 viktigaste kraven och hur du matchar",
    m: { strong: "Stark matchning", partial: "Delvis", gap: "Lucka" } as Record<string, string>,
    tip: "På intervjun",
    addNumber: "Lägg till en siffra",
    ats: "ATS-nyckelord",
    atsHint: "Kontrolleras mot ditt brev medan du redigerar.",
    atsIn: (n: number, total: number) => `${n} av ${total} finns i ditt brev`,
    email: "Mejl till rekryteraren",
    emailHint: "Skicka det med ditt CV och personliga brev bifogade.",
    subject: "Ämne",
    copyEmail: "Kopiera mejlet",
    words: (n: number) => `${n} ord`,
    tone: "Ton",
    professional: "Professionell",
    warm: "Varm",
    concise: "Kortfattad",
    language: "Brevets språk",
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
  existingPack?: ApplicationPack | null;
  application: { id: string; status: string } | null;
};

/**
 * "Apply with AI": draft a cover letter grounded in the user's resume,
 * let them edit it, then mark the job as applied (it lands in the tracker).
 */
export function ApplyWithAI({ jobId, applyUrl, existingLetter, existingPack, application }: Props) {
  const locale = useLocale();
  const t = T[locale];
  const router = useRouter();
  // Defaults to the site language; switch when the job ad is in the other language.
  const [language, setLanguage] = useState<Locale>(locale);
  const [letter, setLetter] = useState(existingLetter ?? "");
  const [tone, setTone] = useState("professional");
  const [achievements, setAchievements] = useState("");
  const [company, setCompany] = useState("");
  const [pack, setPack] = useState<ApplicationPack | null>(existingPack ?? null);
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
          body: JSON.stringify({ job_id: jobId, tone, language, achievements: achievements || undefined, company: company || undefined }),
        }),
      );
      setLetter(body.cover_letter);
      if (body.pack) setPack(body.pack);
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

  const copy = async (text = letter) => {
    await navigator.clipboard.writeText(text);
    setMsg({ kind: "ok", text: t.copied });
  };
  const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;

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
        {t.intro}{" "}
        <a href="/faq#ai-letters" className="text-accent underline underline-offset-2">{t.aiQ}</a>
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
        <label className="block text-xs font-medium text-ink-2">
          {t.achievementsLabel}
          <textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} maxLength={1500} rows={2}
            placeholder={t.achievementsPh}
            className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-ink/40" />
        </label>
        <details className="rounded-xl border border-line bg-paper/40 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-ink-2">{t.companyLabel}</summary>
          <textarea value={company} onChange={(e) => setCompany(e.target.value)} maxLength={3000} rows={4}
            placeholder={t.companyPh} aria-label={t.companyLabel}
            className="mt-2 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/40" />
        </details>
      </div>

      <button onClick={generate} disabled={pending}
        className="mt-3 w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60 sm:w-auto">
        {busy === "gen" ? t.working : letter ? t.newDraft : t.draft}
      </button>

      {letter && (
        <>
          <div className="mt-5 flex items-baseline justify-between">
            <label htmlFor="letter" className="block text-xs font-medium text-muted">{t.yourLetter}</label>
            <span className={`text-xs tabular-nums ${words > 320 ? "text-warn" : "text-muted"}`}>{t.words(words)}</span>
          </div>
          <textarea id="letter" value={letter} onChange={(e) => setLetter(e.target.value)} rows={14}
            className="mt-1.5 w-full rounded-xl border border-line bg-paper/40 p-4 text-sm leading-relaxed outline-none focus:border-ink/40" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => copy()} className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">{t.copy}</button>
            <button onClick={save} disabled={pending} className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">
              {busy === "save" ? t.saving : t.save}
            </button>
          </div>
        </>
      )}

      {letter && pack && <PackDetails pack={pack} letter={letter} t={t} onCopy={copy} />}

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

const BADGE: Record<string, string> = {
  strong: "bg-accent text-paper",
  partial: "bg-accent-soft text-ink",
  gap: "bg-warn-soft text-ink",
};

/** Recruiter analysis, ATS keyword check (live against the edited letter) and the Swedish email. */
function PackDetails({ pack, letter, t, onCopy }: {
  pack: ApplicationPack; letter: string; t: (typeof T)["en"]; onCopy: (text: string) => void;
}) {
  const found = pack.keywords.map((k) => ({ k, in: letterHasKeyword(letter, k) }));
  const n = found.filter((x) => x.in).length;
  const email = `${t.subject}: ${pack.email.subject}\n\n${pack.email.body}`;
  return (
    <div className="mt-6 space-y-6 border-t border-line pt-5">
      {pack.requirements.length > 0 && (
        <div>
          <h3 className="text-base font-semibold">{t.analysis}</h3>
          <p className="text-xs text-muted">{t.reqs}</p>
          <ol className="mt-3 space-y-3">
            {pack.requirements.map((r, i) => (
              <li key={i} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.requirement}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[r.match]}`}>{t.m[r.match]}</span>
                </div>
                {r.evidence && <p className="mt-1 text-ink-2">{r.evidence}</p>}
                {r.interview_tip && r.match !== "strong" && (
                  <p className="mt-1"><span className="font-medium">{t.tip}:</span> {r.interview_tip}</p>
                )}
              </li>
            ))}
          </ol>
          {pack.achievement_note && (
            <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm"><span className="font-medium">{t.addNumber}:</span> {pack.achievement_note}</p>
          )}
        </div>
      )}

      {found.length > 0 && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">{t.ats}</h3>
            <span className="text-xs text-muted">{t.atsIn(n, found.length)}</span>
          </div>
          <p className="text-xs text-muted">{t.atsHint}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {found.map((x) => (
              <li key={x.k} className={`rounded-full border px-2.5 py-1 text-xs ${x.in ? "border-accent/40 bg-accent-soft/60" : "border-line bg-white text-ink-2"}`}>
                <span aria-hidden>{x.in ? "✓ " : "✗ "}</span>{x.k}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pack.email.body && (
        <div>
          <h3 className="text-base font-semibold">{t.email}</h3>
          <p className="text-xs text-muted">{t.emailHint}</p>
          <div className="mt-2 rounded-xl border border-line bg-paper/40 p-4 text-sm leading-relaxed">
            <p><span className="font-medium">{t.subject}:</span> {pack.email.subject}</p>
            <p className="mt-2 whitespace-pre-line">{pack.email.body}</p>
          </div>
          <button onClick={() => onCopy(email)} className="mt-2 rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink/50">{t.copyEmail}</button>
        </div>
      )}
    </div>
  );
}
