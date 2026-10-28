"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { DrivePicker, type DriveConfig } from "@/components/profile/DrivePicker";
import { POPULAR_TITLES, TITLE_OPTIONS, type TitleOption } from "@/lib/onboarding-data";
import { searchMatch } from "@/lib/search-match";

/**
 * Onboarding: one question per screen. Every answer is saved to the profile and used:
 * target roles, level, job types and places feed the fit score and the "For you" ranking.
 */

type Status = "urgent" | "exploring" | "switching" | "open";
type Challenge = "no_reply" | "time" | "fit" | "start";
type Level = "entry" | "mid" | "senior" | "lead" | "unsure";
type JobType = "full_time" | "part_time" | "contract";
type Mode = "remote" | "hybrid" | "onsite";
type Step = "status" | "challenge" | "why" | "titles" | "level" | "levelInfo" | "types" | "mode" | "places" | "salary" | "review" | "resume" | "plan";
/** Screens that explain rather than ask; they are not counted as questions. */
const INFO_STEPS: Step[] = ["why", "levelInfo", "review", "plan"];
const SALARY_PRESETS = [25000, 30000, 35000, 40000, 50000];

const LEVEL_TO_SENIORITY: Record<Level, string | null> = { entry: "junior", mid: "mid", senior: "senior", lead: "lead", unsure: null };

const T = defineT({
  en: {
    back: "Back",
    step: (n: number, of: number) => `Step ${n} of ${of}`,
    cont: "Continue",
    skip: "Skip",
    status: {
      q: "What's your situation right now?",
      sub: "So we know how to help you best.",
      urgent: "Looking for work and need a job soon",
      exploring: "Looking for work, exploring my options",
      switching: "Employed and ready to switch",
      open: "Employed, but open to the right offer",
    },
    challenge: {
      q: "What's hardest about your job search?",
      no_reply: "I apply but rarely hear back",
      time: "Applying takes too much time",
      fit: "Hard to find jobs that actually fit me",
      start: "I'm not sure where to start",
    },
    why: {
      no_reply: ["Apply where you have a real chance.", "Before you apply, Fitwise shows your match score and the skills you're missing. You put your effort into the jobs that fit, and send fewer, stronger applications."],
      time: ["Minutes per application, not hours.", "Upload your CV once. Every job gets a match score, and one click writes a first draft of the cover letter from your real experience. You read it, adjust it and send it."],
      fit: ["Every job, scored against you.", "Fitwise compares each job's requirements with your skills, experience, level and location, and explains the score. Filter by town, skill and job type, like on Platsbanken."],
      start: ["We'll show you where to start.", "Upload your CV and we'll suggest roles you fit right now, rank matching jobs for you, and point out the skills worth learning next."],
    },
    titles: {
      q: "Which job are you looking for?",
      label: "Job title or keyword",
      ph: "Search, e.g. Buyer or Warehouse",
      add: (t: string) => `Add "${t}"`,
      recommended: "Recommended",
      popular: "Popular",
      hint: "Pick up to 5. A specific title (\"Purchasing Coordinator\") gives better matches than a broad one (\"Manager\").",
      remove: (t: string) => `Remove ${t}`,
    },
    level: {
      q: "Which experience level fits you best?",
      entry: ["Entry level", "New to working life, or early in my career"],
      mid: ["Experienced", "A few years in the field"],
      senior: ["Senior", "Many years, I can lead projects or others"],
      lead: ["Manager", "Head of a team, department or company"],
      unsure: ["Not sure", "Let my CV decide"],
    },
    levelInfo: ["Your level counts in every score.", "Jobs at your level score higher, so you see roles you can grow in, without aiming far too low or too high."],
    types: { q: "What kind of employment do you want?", sub: "Choose one or more.", full_time: "Full-time", part_time: "Part-time", contract: "Temporary or project", any: "Open to anything" },
    mode: { q: "How do you want to work?", remote: "Remote", hybrid: "Hybrid", onsite: "On site", note: "Remote moves remote jobs up and the rest down." },
    places: { q: "Where do you want to work?", sub: "Pick towns, or type your own.", ph: "Type a town", anywhere: "Anywhere in Sweden", add: (t: string) => `Add "${t}"` },
    resume: {
      q: "Last step: add your CV",
      sub: "We read your skills and experience from it, so every job gets a real match score.",
      drop: "Drag your CV here",
      or: "or",
      choose: "Choose a file",
      types: "PDF, Word (.docx) or text, up to 4 MB",
      reading: "Reading your CV… (10–20 seconds)",
      later: "Skip for now, I'll add my skills later",
      note: "Your CV is never shown to employers or sold.",
      badType: "That file type can't be read. Upload a PDF, Word (.docx) or text file.",
      oldDoc: "Old Word files (.doc) can't be read. Save it as .docx or PDF and try again.",
      tooBig: "That file is too big. Upload a CV under 4 MB.",
      failed: (s: number) => `Upload failed (error ${s}). Try again, or skip for now.`,
    },
    salary: {
      q: "What's the lowest monthly salary you'd accept?",
      sub: "Before tax, in SEK per month.",
      label: "Minimum salary (SEK / month)",
      kr: (n: number) => `${n.toLocaleString("sv-SE")} kr`,
      note: "Many Swedish ads don't state a salary. This only moves jobs that do: ads paying less go down in \"For you\".",
      skip: "Skip, salary doesn't decide for me",
    },
    review: {
      q: "Almost there!",
      sub: "Check your answers. Tap Edit to change one.",
      edit: "Edit",
      titles: "Jobs you're looking for",
      level: "Experience level",
      types: "Employment",
      mode: "Way of working",
      places: "Where",
      salary: "Minimum salary",
      none: "Not chosen",
      anywhere: "Anywhere in Sweden",
      perMonth: (n: number) => `${n.toLocaleString("sv-SE")} kr / month`,
      counting: "Counting matching jobs…",
      count: (n: number) => (n === 1 ? "1 open job matches your answers right now" : `${n.toLocaleString("sv-SE")} open jobs match your answers right now`),
      zero: "No open jobs match all your answers right now. New jobs arrive every day, and you can widen your choices on the Jobs page.",
      newest: "Newest:",
      save: "Save and continue",
    },
    plan: {
      q: "You're all set. Here's what happens next",
      today: ["Today", "See your matches", "Every job gets a match score against your profile, with the skills you have and the ones you're missing."],
      week: ["This week", "Apply where you fit", "Save jobs you like, and get a first-draft cover letter in Swedish or English. You read it, adjust it and send it yourself."],
      later: ["Ongoing", "Keep track", "Mark jobs as applied and follow every application on your Overview. Your ranking learns from what you save and pass on."],
      cta: "Show my matches",
      ctaNoCv: "Browse jobs",
    },
    saveFailed: "Couldn't save your answers. Check your connection and try again.",
  },
  sv: {
    back: "Tillbaka",
    step: (n: number, of: number) => `Steg ${n} av ${of}`,
    cont: "Fortsätt",
    skip: "Hoppa över",
    status: {
      q: "Hur ser din situation ut just nu?",
      sub: "Så vet vi hur vi hjälper dig bäst.",
      urgent: "Arbetssökande och behöver jobb snart",
      exploring: "Arbetssökande och ser mig om",
      switching: "Har jobb och vill byta",
      open: "Har jobb men är öppen för rätt erbjudande",
    },
    challenge: {
      q: "Vad är svårast med ditt jobbsökande?",
      no_reply: "Jag söker men får sällan svar",
      time: "Det tar för lång tid att söka",
      fit: "Svårt att hitta jobb som passar mig",
      start: "Jag vet inte var jag ska börja",
    },
    why: {
      no_reply: ["Sök där du har en verklig chans.", "Innan du söker visar Fitwise din matchningspoäng och vilka kompetenser som saknas. Du lägger kraften på jobben som passar och skickar färre, starkare ansökningar."],
      time: ["Minuter per ansökan, inte timmar.", "Ladda upp ditt CV en gång. Varje jobb får en matchningspoäng, och ett klick skriver ett första utkast till personligt brev utifrån din riktiga erfarenhet. Du läser, justerar och skickar."],
      fit: ["Varje jobb, jämfört med dig.", "Fitwise jämför varje jobbs krav med dina kompetenser, din erfarenhet, nivå och ort, och förklarar poängen. Filtrera på ort, kompetens och anställningsform, som på Platsbanken."],
      start: ["Vi visar var du kan börja.", "Ladda upp ditt CV så föreslår vi roller du passar för nu, rankar jobben som matchar dig och visar vilka kompetenser som är värda att lära sig."],
    },
    titles: {
      q: "Vilket jobb letar du efter?",
      label: "Yrke eller sökord",
      ph: "Sök, t.ex. Inköpare eller Lager",
      add: (t: string) => `Lägg till ”${t}”`,
      recommended: "Rekommenderade",
      popular: "Populära",
      hint: "Välj upp till 5. En tydlig titel (”Operativ inköpare”) ger bättre matchningar än en bred (”Chef”).",
      remove: (t: string) => `Ta bort ${t}`,
    },
    level: {
      q: "Vilken erfarenhetsnivå passar dig bäst?",
      entry: ["Nybörjare", "Ny i arbetslivet eller tidigt i karriären"],
      mid: ["Erfaren", "Några års erfarenhet inom området"],
      senior: ["Senior", "Många år, kan leda projekt eller andra"],
      lead: ["Chef", "Leder ett team, en avdelning eller ett företag"],
      unsure: ["Vet inte", "Låt mitt CV avgöra"],
    },
    levelInfo: ["Din nivå räknas in i varje poäng.", "Jobb på din nivå får högre poäng, så du ser roller du kan växa i, utan att sikta alldeles för lågt eller för högt."],
    types: { q: "Vilken anställningsform vill du ha?", sub: "Välj en eller flera.", full_time: "Heltid", part_time: "Deltid", contract: "Visstid eller projekt", any: "Öppen för allt" },
    mode: { q: "Hur vill du arbeta?", remote: "På distans", hybrid: "Hybrid", onsite: "På plats", note: "Distans flyttar upp distansjobb och resten ner." },
    places: { q: "Var vill du arbeta?", sub: "Välj orter eller skriv en egen.", ph: "Skriv en ort", anywhere: "Hela Sverige", add: (t: string) => `Lägg till ”${t}”` },
    resume: {
      q: "Sista steget: lägg till ditt CV",
      sub: "Vi läser ut dina kompetenser och din erfarenhet, så att varje jobb får en riktig matchningspoäng.",
      drop: "Dra hit ditt CV",
      or: "eller",
      choose: "Välj en fil",
      types: "PDF, Word (.docx) eller text, upp till 4 MB",
      reading: "Läser ditt CV… (10–20 sekunder)",
      later: "Hoppa över, jag lägger till kompetenser senare",
      note: "Ditt CV visas aldrig för arbetsgivare och säljs aldrig.",
      badType: "Den filtypen kan inte läsas. Ladda upp en PDF, Word-fil (.docx) eller textfil.",
      oldDoc: "Gamla Word-filer (.doc) kan inte läsas. Spara som .docx eller PDF och försök igen.",
      tooBig: "Filen är för stor. Ladda upp ett CV under 4 MB.",
      failed: (s: number) => `Uppladdningen misslyckades (fel ${s}). Försök igen eller hoppa över.`,
    },
    salary: {
      q: "Vilken är den lägsta månadslön du kan tänka dig?",
      sub: "Före skatt, i kronor per månad.",
      label: "Lägsta lön (kr / månad)",
      kr: (n: number) => `${n.toLocaleString("sv-SE")} kr`,
      note: "Många svenska annonser anger ingen lön. Det här påverkar bara de som gör det: annonser med lägre lön flyttas ner i ”För dig”.",
      skip: "Hoppa över, lönen avgör inte för mig",
    },
    review: {
      q: "Nästan klart!",
      sub: "Kontrollera dina svar. Tryck på Ändra för att byta.",
      edit: "Ändra",
      titles: "Jobb du letar efter",
      level: "Erfarenhetsnivå",
      types: "Anställningsform",
      mode: "Arbetssätt",
      places: "Var",
      salary: "Lägsta lön",
      none: "Inte valt",
      anywhere: "Hela Sverige",
      perMonth: (n: number) => `${n.toLocaleString("sv-SE")} kr / månad`,
      counting: "Räknar matchande jobb…",
      count: (n: number) => (n === 1 ? "1 ledigt jobb matchar dina svar just nu" : `${n.toLocaleString("sv-SE")} lediga jobb matchar dina svar just nu`),
      zero: "Inga lediga jobb matchar alla dina svar just nu. Nya jobb kommer varje dag, och du kan bredda dina val på Jobb-sidan.",
      newest: "Senaste:",
      save: "Spara och fortsätt",
    },
    plan: {
      q: "Klart! Så här går det vidare",
      today: ["Idag", "Se dina matchningar", "Varje jobb får en matchningspoäng mot din profil, med kompetenserna du har och dem som saknas."],
      week: ["Den här veckan", "Sök där du passar", "Spara jobb du gillar och få ett första utkast till personligt brev på svenska eller engelska. Du läser, justerar och skickar själv."],
      later: ["Framöver", "Håll koll", "Markera jobb som sökta och följ varje ansökan i din Översikt. Din ranking lär sig av vad du sparar och väljer bort."],
      cta: "Visa mina matchningar",
      ctaNoCv: "Bläddra bland jobb",
    },
    saveFailed: "Det gick inte att spara dina svar. Kontrollera anslutningen och försök igen.",
  },
});

export type OnboardingInitial = {
  status: Status | null;
  titles: string[];
  seniority: string | null;
  jobTypes: string[];
  mode: Mode | null;
  locations: string[];
  /** Stored per year; asked per month. */
  salaryMinYear: number | null;
};

export function OnboardingFlow({
  initial,
  towns,
  drive,
}: {
  initial: OnboardingInitial;
  towns: string[];
  drive: DriveConfig | null;
}) {
  const locale = useLocale();
  const t = T[locale];
  const router = useRouter();

  const [status, setStatus] = useState<Status | null>(initial.status);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [titles, setTitles] = useState<string[]>(initial.titles.slice(0, 5));
  const [level, setLevel] = useState<Level | null>(null);
  const [types, setTypes] = useState<JobType[] | "any" | null>(
    initial.jobTypes.length ? (initial.jobTypes.filter((x) => x !== "internship") as JobType[]) : null,
  );
  const [mode, setMode] = useState<Mode | null>(initial.mode);
  const [places, setPlaces] = useState<string[] | "anywhere">(initial.locations.length ? initial.locations : []);
  const [salary, setSalary] = useState<number | null>(initial.salaryMinYear ? Math.round(initial.salaryMinYear / 12) : null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const steps: Step[] = useMemo(
    () =>
      ["status", "challenge", "why", "titles", "level", "levelInfo", "types", "mode", ...(mode === "remote" ? [] : ["places" as const]), "salary", "review", "resume", "plan"] as Step[],
    [mode],
  );
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  // After "Edit" on the review screen, answering goes straight back to the review.
  const next = () => {
    if (editing) {
      setEditing(false);
      setI(steps.indexOf("review"));
    } else setI((n) => Math.min(n + 1, steps.length - 1));
  };
  const edit = (target: Step) => {
    setEditing(true);
    setI(steps.indexOf(target));
  };
  const back = () => setI((n) => Math.max(0, n - 1));
  // Choosing a single answer moves on after a short beat, so the tick is seen.
  const pickThenNext = <V,>(set: (v: V) => void, v: V) => {
    set(v);
    setTimeout(next, 220);
  };

  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    top.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  /** Saves every answer before the CV step, so skipping the CV keeps them. */
  const save = async () => {
    const titleOpts = titles.map((x) => TITLE_OPTIONS.find((o) => o.sv === x || o.en === x));
    const targetTitles = [...new Set(titles.flatMap((x, k) => (titleOpts[k] ? [titleOpts[k]!.sv, titleOpts[k]!.en] : [x])))].slice(0, 10);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(level ? { seniority: LEVEL_TO_SENIORITY[level] } : {}),
        preferences: {
          target_titles: targetTitles,
          job_types: types === "any" || !types ? [] : types,
          work_mode: mode,
          remote_only: mode === "remote",
          locations: mode === "remote" || places === "anywhere" ? [] : places.slice(0, 10),
          search_status: status,
          salary_min: salary ? salary * 12 : null,
          onboarded: true,
        },
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
  };

  const toResume = async () => {
    setSaving(true);
    setError(null);
    try {
      await save();
      setI(steps.indexOf("resume"));
    } catch {
      setError(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const finish = (to = "/dashboard") => {
    router.push(to);
    router.refresh();
  };

  const progress = Math.round(((i + 1) / steps.length) * 100);
  const questionNo = steps.slice(0, i + 1).filter((s) => !INFO_STEPS.includes(s)).length;
  const questionCount = steps.filter((s) => !INFO_STEPS.includes(s)).length;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={back}
            disabled={i === 0}
            className="flex items-center gap-1 text-sm text-ink-2 hover:text-ink disabled:invisible"
          >
            <span aria-hidden>←</span> {t.back}
          </button>
          <span className="flex items-center gap-2 font-display text-xl">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent font-sans text-xs font-semibold text-paper">f</span>
            Fitwise
          </span>
          <LanguageSwitcher />
        </div>
        <div className="h-1 bg-line/60" aria-hidden>
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-10 sm:pt-14">
        <div ref={top} tabIndex={-1} className="outline-none">
          {!INFO_STEPS.includes(step) && <p className="text-center text-xs font-medium uppercase tracking-wider text-muted">{t.step(questionNo, questionCount)}</p>}

          {step === "status" && (
            <Question title={t.status.q} sub={t.status.sub}>
              {(["urgent", "exploring", "switching", "open"] as Status[]).map((v) => (
                <Choice key={v} label={t.status[v]} selected={status === v} onClick={() => pickThenNext(setStatus, v)} />
              ))}
            </Question>
          )}

          {step === "challenge" && (
            <Question title={t.challenge.q}>
              {(["no_reply", "time", "fit", "start"] as Challenge[]).map((v) => (
                <Choice key={v} label={t.challenge[v]} selected={challenge === v} onClick={() => pickThenNext(setChallenge, v)} />
              ))}
            </Question>
          )}

          {step === "why" && <Info icon="target" title={t.why[challenge ?? "fit"][0]} body={t.why[challenge ?? "fit"][1]} cta={t.cont} onNext={next} />}

          {step === "titles" && <TitlesStep t={t} titles={titles} setTitles={setTitles} onNext={next} />}

          {step === "level" && (
            <Question title={t.level.q}>
              {(["entry", "mid", "senior", "lead", "unsure"] as Level[]).map((v) => (
                <Choice key={v} label={t.level[v][0]} hint={t.level[v][1]} selected={level === v} onClick={() => pickThenNext(setLevel, v)} />
              ))}
            </Question>
          )}

          {step === "levelInfo" && <Info icon="level" title={t.levelInfo[0]} body={t.levelInfo[1]} cta={t.cont} onNext={next} />}

          {step === "types" && (
            <Question title={t.types.q} sub={t.types.sub}>
              {(["full_time", "part_time", "contract"] as JobType[]).map((v) => {
                const on = Array.isArray(types) && types.includes(v);
                return (
                  <Choice
                    key={v}
                    multi
                    label={t.types[v]}
                    selected={on}
                    onClick={() => setTypes((cur) => {
                      const list = Array.isArray(cur) ? cur : [];
                      const nextList = on ? list.filter((x) => x !== v) : [...list, v];
                      return nextList.length ? nextList : null;
                    })}
                  />
                );
              })}
              <Choice multi label={t.types.any} selected={types === "any"} onClick={() => setTypes((cur) => (cur === "any" ? null : "any"))} />
              <Continue label={t.cont} disabled={!types} onClick={next} />
            </Question>
          )}

          {step === "mode" && (
            <Question title={t.mode.q} note={t.mode.note}>
              {(["remote", "hybrid", "onsite"] as Mode[]).map((v) => (
                <Choice key={v} label={t.mode[v]} selected={mode === v} onClick={() => pickThenNext(setMode, v)} />
              ))}
            </Question>
          )}

          {step === "places" && (
            <PlacesStep t={t} towns={towns} places={places} setPlaces={setPlaces} saving={saving} onNext={next} />
          )}
          {step === "salary" && <SalaryStep t={t} salary={salary} setSalary={setSalary} onNext={next} />}
          {step === "review" && (
            <ReviewStep
              t={t}
              titles={titles}
              level={level ? t.level[level][0] : null}
              types={types === "any" ? [t.types.any] : (types ?? []).map((x) => t.types[x])}
              mode={mode ? t.mode[mode] : null}
              places={mode === "remote" ? null : places}
              salary={salary}
              query={{
                titles: titles.flatMap((x) => {
                  const o = TITLE_OPTIONS.find((y) => y.sv === x || y.en === x);
                  return o ? [o.sv, o.en] : [x];
                }),
                places: mode === "remote" || places === "anywhere" ? [] : places,
                types: types === "any" || !types ? [] : types,
                remote: mode === "remote",
              }}
              saving={saving}
              onEdit={edit}
              onNext={toResume}
            />
          )}
          {step === "resume" && (
            <ResumeStep
              t={t}
              drive={drive}
              onDone={() => {
                setUploaded(true);
                next();
              }}
              onSkip={next}
            />
          )}
          {step === "plan" && <PlanStep t={t} cta={uploaded ? t.plan.cta : t.plan.ctaNoCv} onNext={() => finish(uploaded ? "/dashboard" : "/jobs")} />}

          {error && <p role="alert" className="mt-4 text-center text-sm text-warn">{error}</p>}
        </div>
      </main>
    </div>
  );
}

function Question({ title, sub, note, children }: { title: string; sub?: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="mt-3 text-center font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
      {sub && <p className="mt-2 text-center text-ink-2">{sub}</p>}
      <div className="mt-8 space-y-3">{children}</div>
      {note && <p className="mt-4 flex items-start gap-2 text-sm text-muted"><span aria-hidden>ⓘ</span>{note}</p>}
    </section>
  );
}

function Choice({ label, hint, selected, multi, onClick }: { label: string; hint?: string; selected: boolean; multi?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors ${
        selected ? "border-accent bg-accent-soft/60" : "border-line bg-white hover:border-ink/30"
      }`}
    >
      <span
        aria-hidden
        className={`grid h-5 w-5 shrink-0 place-items-center border text-[11px] text-paper ${multi ? "rounded-md" : "rounded-full"} ${
          selected ? "border-accent bg-accent" : "border-line bg-white"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  );
}

function Continue({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 w-full rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function Info({ icon, title, body, cta, onNext }: { icon: "target" | "level"; title: string; body: string; cta: string; onNext: () => void }) {
  return (
    <section className="text-center">
      <div aria-hidden className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-accent-soft">
        {icon === "target" ? (
          <svg viewBox="0 0 48 48" className="h-14 w-14 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="24" cy="24" r="18" />
            <circle cx="24" cy="24" r="10" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 48 48" className="h-14 w-14 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M10 38V28M20 38V20M30 38V14M40 38V8" />
          </svg>
        )}
      </div>
      <h1 className="mt-8 font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-2">{body}</p>
      <Continue label={cta} onClick={onNext} />
    </section>
  );
}

type Tx = (typeof T)["sv"];

function Chip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <li className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft py-1.5 pl-3 pr-1.5 text-sm font-medium text-accent">
      {label}
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="grid h-5 w-5 place-items-center rounded-full hover:bg-accent/15">
        ×
      </button>
    </li>
  );
}

function AddChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:border-ink/40">
        <span aria-hidden className="text-muted">+ </span>
        {label}
      </button>
    </li>
  );
}

function TitlesStep({ t, titles, setTitles, onNext }: { t: Tx; titles: string[]; setTitles: (v: string[]) => void; onNext: () => void }) {
  const locale = useLocale();
  const [q, setQ] = useState("");
  const show = (o: TitleOption) => (locale === "sv" ? o.sv : o.en);
  const chosen = new Set(titles.map((x) => x.toLowerCase()));
  const isChosen = (o: TitleOption) => chosen.has(o.sv.toLowerCase()) || chosen.has(o.en.toLowerCase());
  const full = titles.length >= 5;
  const add = (x: string) => {
    const v = x.trim();
    if (!v || full || chosen.has(v.toLowerCase())) return;
    setTitles([...titles, v]);
    setQ("");
  };

  const query = q.trim();
  const matches = query ? TITLE_OPTIONS.filter((o) => !isChosen(o) && (searchMatch(o.sv, query) || searchMatch(o.en, query))).slice(0, 8) : [];
  const groups = new Set(titles.map((x) => TITLE_OPTIONS.find((o) => o.sv === x || o.en === x)?.group).filter(Boolean));
  const recommended = groups.size
    ? TITLE_OPTIONS.filter((o) => groups.has(o.group) && !isChosen(o)).slice(0, 6)
    : TITLE_OPTIONS.filter((o) => POPULAR_TITLES.includes(o.sv) && !isChosen(o));
  const exact = TITLE_OPTIONS.some((o) => [o.sv, o.en].some((x) => x.toLowerCase() === query.toLowerCase()));

  return (
    <Question title={t.titles.q}>
      <div>
        <label htmlFor="title-q" className="text-sm font-medium">{t.titles.label}</label>
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 focus-within:border-ink/40 focus-within:ring-2 focus-within:ring-accent-soft">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" strokeLinecap="round" />
          </svg>
          <input
            id="title-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(matches[0] ? show(matches[0]) : q);
              }
            }}
            disabled={full}
            placeholder={t.titles.ph}
            className="min-w-0 flex-1 bg-transparent py-3.5 outline-none placeholder:text-muted disabled:opacity-50"
          />
        </div>
        {query && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {matches.map((o) => <AddChip key={o.sv} label={show(o)} onClick={() => add(show(o))} />)}
            {!exact && query.length > 1 && <AddChip label={t.titles.add(query)} onClick={() => add(query)} />}
          </ul>
        )}
      </div>

      {titles.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {titles.map((x) => <Chip key={x} label={x} removeLabel={t.titles.remove(x)} onRemove={() => setTitles(titles.filter((y) => y !== x))} />)}
        </ul>
      )}

      {!full && !query && recommended.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{groups.size ? t.titles.recommended : t.titles.popular}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recommended.map((o) => <AddChip key={o.sv} label={show(o)} onClick={() => add(show(o))} />)}
          </ul>
        </div>
      )}

      <Continue label={titles.length ? t.cont : t.skip} onClick={onNext} />
      <p className="flex items-start gap-2 text-sm text-muted"><span aria-hidden>ⓘ</span>{t.titles.hint}</p>
    </Question>
  );
}

function PlacesStep({
  t,
  towns,
  places,
  setPlaces,
  saving,
  onNext,
}: {
  t: Tx;
  towns: string[];
  places: string[] | "anywhere";
  setPlaces: (v: string[] | "anywhere") => void;
  saving: boolean;
  onNext: () => void;
}) {
  const [q, setQ] = useState("");
  const list = places === "anywhere" ? [] : places;
  const has = (x: string) => list.some((y) => y.toLowerCase() === x.toLowerCase());
  const add = (x: string) => {
    const v = x.trim();
    if (!v || has(v) || list.length >= 10) return;
    setPlaces([...list, v]);
    setQ("");
  };
  const query = q.trim();
  const shown = (query ? towns.filter((x) => searchMatch(x, query)) : towns).filter((x) => !has(x)).slice(0, 12);

  return (
    <Question title={t.places.q} sub={t.places.sub}>
      <Choice multi label={t.places.anywhere} selected={places === "anywhere"} onClick={() => setPlaces(places === "anywhere" ? [] : "anywhere")} />
      {places !== "anywhere" && (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(shown[0] ?? q);
              }
            }}
            placeholder={t.places.ph}
            aria-label={t.places.ph}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3.5 outline-none focus:border-ink/40"
          />
          {list.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {list.map((x) => <Chip key={x} label={x} removeLabel={x} onRemove={() => setPlaces(list.filter((y) => y !== x))} />)}
            </ul>
          )}
          <ul className="flex flex-wrap gap-2">
            {shown.map((x) => <AddChip key={x} label={x} onClick={() => add(x)} />)}
            {query.length > 1 && !towns.some((x) => x.toLowerCase() === query.toLowerCase()) && <AddChip label={t.places.add(query)} onClick={() => add(query)} />}
          </ul>
        </>
      )}
      <Continue label={t.cont} disabled={saving || (places !== "anywhere" && list.length === 0)} onClick={onNext} />
    </Question>
  );
}

function ResumeStep({ t, drive, onDone, onSkip }: { t: Tx; drive: DriveConfig | null; onDone: () => void; onSkip: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const check = (f: File) => {
    const ext = f.name.toLowerCase().split(".").pop() ?? "";
    if (ext === "doc") return t.resume.oldDoc;
    if (!["pdf", "docx", "txt"].includes(ext)) return t.resume.badType;
    if (f.size > 4 * 1024 * 1024) return t.resume.tooBig;
    return null;
  };

  const upload = async (f: File) => {
    const problem = check(f);
    if (problem) return setMsg(problem);
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/resume", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? t.resume.failed(res.status));
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Question title={t.resume.q} sub={t.resume.sub}>
      <label
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) upload(f);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft/60" : "border-line bg-white hover:border-accent/50"
        } ${busy ? "cursor-wait" : ""}`}
      >
        {busy ? (
          <span className="flex items-center gap-2 font-medium">
            <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            {t.resume.reading}
          </span>
        ) : (
          <>
            <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" />
            </svg>
            <span className="mt-3 font-medium">{t.resume.drop}</span>
            <span className="my-2 text-xs uppercase tracking-wider text-muted">{t.resume.or}</span>
            <span className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper">{t.resume.choose}</span>
            <span className="mt-3 text-xs text-muted">{t.resume.types}</span>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          disabled={busy}
          accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {drive && <DrivePicker config={drive} disabled={busy} onFile={upload} onError={setMsg} />}
      {msg && <p role="alert" className="text-sm text-warn">{msg}</p>}
      <button
        type="button"
        onClick={onSkip}
        disabled={busy}
        className="w-full rounded-full border border-line bg-white px-6 py-3 text-sm text-ink-2 hover:border-ink/40 disabled:opacity-50"
      >
        {t.resume.later}
      </button>
      <p className="text-center text-xs text-muted">{t.resume.note}</p>
    </Question>
  );
}

function SalaryStep({ t, salary, setSalary, onNext }: { t: Tx; salary: number | null; setSalary: (v: number | null) => void; onNext: () => void }) {
  const [text, setText] = useState(salary ? String(salary) : "");
  const set = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 7);
    setText(digits);
    setSalary(digits ? Number(digits) : null);
  };
  return (
    <Question title={t.salary.q} sub={t.salary.sub} note={t.salary.note}>
      <ul className="flex flex-wrap justify-center gap-2">
        {SALARY_PRESETS.map((n) => (
          <li key={n}>
            <button
              type="button"
              aria-pressed={salary === n}
              onClick={() => set(String(n))}
              className={`rounded-full border px-4 py-2 text-sm font-medium tabular-nums ${
                salary === n ? "border-accent bg-accent-soft text-accent" : "border-line bg-white hover:border-ink/40"
              }`}
            >
              {t.salary.kr(n)}
            </button>
          </li>
        ))}
      </ul>
      <label className="block pt-2">
        <span className="text-sm font-medium">{t.salary.label}</span>
        <div className="mt-2 flex items-center rounded-2xl border border-line bg-white px-4 focus-within:border-ink/40 focus-within:ring-2 focus-within:ring-accent-soft">
          <input
            inputMode="numeric"
            value={text ? Number(text).toLocaleString("sv-SE") : ""}
            onChange={(e) => set(e.target.value)}
            placeholder="32 000"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-lg tabular-nums outline-none placeholder:text-muted"
          />
          <span className="text-sm text-muted">kr / mån</span>
        </div>
      </label>
      <Continue label={t.cont} disabled={!salary} onClick={onNext} />
      <button
        type="button"
        onClick={() => {
          set("");
          onNext();
        }}
        className="w-full py-2 text-sm text-ink-2 underline underline-offset-2 hover:text-ink"
      >
        {t.salary.skip}
      </button>
    </Question>
  );
}

type Preview = { count: number; examples: { id: string; title: string; company: string; location: string | null }[] };

function ReviewStep({
  t,
  titles,
  level,
  types,
  mode,
  places,
  salary,
  query,
  saving,
  onEdit,
  onNext,
}: {
  t: Tx;
  titles: string[];
  level: string | null;
  types: string[];
  mode: string | null;
  places: string[] | "anywhere" | null;
  salary: number | null;
  query: { titles: string[]; places: string[]; types: string[]; remote: boolean };
  saving: boolean;
  onEdit: (s: Step) => void;
  onNext: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const key = JSON.stringify(query);
  useEffect(() => {
    let live = true;
    setPreview(null);
    fetch("/api/onboarding/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: key })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setPreview(d ?? { count: -1, examples: [] }))
      .catch(() => live && setPreview({ count: -1, examples: [] }));
    return () => {
      live = false;
    };
  }, [key]);

  const rows: { step: Step; label: string; value: string }[] = [
    { step: "titles", label: t.review.titles, value: titles.join(" · ") || t.review.none },
    { step: "level", label: t.review.level, value: level ?? t.review.none },
    { step: "types", label: t.review.types, value: types.join(", ") || t.review.none },
    { step: "mode", label: t.review.mode, value: mode ?? t.review.none },
    ...(places === null ? [] : [{ step: "places" as Step, label: t.review.places, value: places === "anywhere" ? t.review.anywhere : places.join(", ") || t.review.none }]),
    { step: "salary", label: t.review.salary, value: salary ? t.review.perMonth(salary) : t.review.none },
  ];

  return (
    <section>
      <h1 className="text-center font-display text-3xl leading-tight sm:text-4xl">{t.review.q}</h1>
      <p className="mt-2 text-center text-ink-2">{t.review.sub}</p>

      <div aria-live="polite" className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft/50 p-4">
        {!preview ? (
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            {t.review.counting}
          </p>
        ) : preview.count > 0 ? (
          <>
            <p className="font-semibold text-accent">{t.review.count(preview.count)}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted">{t.review.newest}</p>
            <ul className="mt-1 space-y-1 text-sm">
              {preview.examples.map((e) => (
                <li key={e.id} className="truncate">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-muted"> · {e.company}{e.location ? ` · ${e.location.split(",")[0]}` : ""}</span>
                </li>
              ))}
            </ul>
          </>
        ) : preview.count === 0 ? (
          <p className="text-sm text-ink-2">{t.review.zero}</p>
        ) : null}
      </div>

      <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
        {rows.map((r) => (
          <div key={r.step} className="flex items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{r.label}</dt>
              <dd className="mt-1">{r.value}</dd>
            </div>
            <button type="button" onClick={() => onEdit(r.step)} className="shrink-0 text-sm text-accent underline underline-offset-2">
              {t.review.edit}
            </button>
          </div>
        ))}
      </dl>
      <Continue label={t.review.save} disabled={saving} onClick={onNext} />
    </section>
  );
}

function PlanStep({ t, cta, onNext }: { t: Tx; cta: string; onNext: () => void }) {
  const items = [t.plan.today, t.plan.week, t.plan.later];
  return (
    <section>
      <h1 className="text-center font-display text-3xl leading-tight sm:text-4xl">{t.plan.q}</h1>
      <ol className="mt-8">
        {items.map(([when, title, body], k) => (
          <li key={when} className="relative flex gap-4 pb-7 last:pb-0">
            {k < items.length - 1 && <span aria-hidden className="absolute left-[7px] top-5 h-full w-0.5 bg-line" />}
            <span aria-hidden className={`relative mt-1 h-4 w-4 shrink-0 rounded-full ${k === 0 ? "bg-accent" : "border-2 border-line bg-paper"}`} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{when}</p>
              <p className="mt-1 font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Continue label={cta} onClick={onNext} />
    </section>
  );
}
