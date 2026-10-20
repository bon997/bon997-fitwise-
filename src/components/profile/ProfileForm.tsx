"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { skillLabel } from "@/lib/format";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    tooBig: "That file is too big. Upload a resume under 4 MB.",
    tooSlow: "Reading the resume took too long. Try again, or upload a smaller PDF.",
    failed: (s: number) => `Upload failed (error ${s}). Try again in a minute.`,
    read: "Resume read. Check the skills below and fix anything we got wrong.",
    checkValues: "Please check the highlighted values.",
    couldNotSave: "Could not save",
    saved: "Saved. Your matches are updated.",
    resume: "Resume",
    resumeHas: "Upload a newer version any time; your skills are re-read from it.",
    resumeNew: "Upload your resume and we'll fill in your skills and experience. PDF, Word (.docx) or text, up to 4 MB.",
    reading: "Reading your resume…",
    choose: "Choose a file",
    skip: "or skip this and add skills by hand below",
    rolesNow: "Roles you fit now",
    stronger: "Make your resume stronger",
    about: "About you",
    name: "Name",
    years: "Years of experience",
    level: "Level",
    notSet: "Not set",
    intern: "Intern", junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead", executive: "Executive",
    skills: "Skills",
    skillsNote: "— the most important input for your fit score",
    remove: (s: string) => `Remove ${s}`,
    noSkills: "No skills yet.",
    addPh: "Add skills, e.g. React, SQL, Figma",
    addLabel: "Add skills",
    add: "Add",
    looking: "What you're looking for",
    lookingNote: "These tailor your \"For you\" ranking. Saving, applying and passing on jobs tunes it further over time.",
    roles: "Target roles",
    comma: "(comma-separated)",
    rolesPh: "Frontend Engineer, Product Engineer",
    suggested: "Suggested from your resume:",
    locations: "Preferred locations",
    salary: "Minimum salary",
    perYear: "(per year)",
    remote: "Only show me remote jobs",
    saving: "Saving…",
    save: "Save profile",
  },
  sv: {
    tooBig: "Filen är för stor. Ladda upp ett CV under 4 MB.",
    tooSlow: "Det tog för lång tid att läsa CV:t. Försök igen eller ladda upp en mindre PDF.",
    failed: (s: number) => `Uppladdningen misslyckades (fel ${s}). Försök igen om en minut.`,
    read: "CV:t är inläst. Kontrollera kompetenserna nedan och rätta det vi fått fel.",
    checkValues: "Kontrollera de markerade värdena.",
    couldNotSave: "Kunde inte spara",
    saved: "Sparat. Dina matchningar är uppdaterade.",
    resume: "CV",
    resumeHas: "Ladda upp en nyare version när du vill; dina kompetenser läses in på nytt.",
    resumeNew: "Ladda upp ditt CV så fyller vi i dina kompetenser och din erfarenhet. PDF, Word (.docx) eller text, upp till 4 MB.",
    reading: "Läser ditt CV…",
    choose: "Välj en fil",
    skip: "eller hoppa över och lägg till kompetenser själv nedan",
    rolesNow: "Roller du passar för nu",
    stronger: "Gör ditt CV starkare",
    about: "Om dig",
    name: "Namn",
    years: "År av erfarenhet",
    level: "Nivå",
    notSet: "Inte angiven",
    intern: "Praktikant", junior: "Junior", mid: "Mellannivå", senior: "Senior", lead: "Lead / ledande", executive: "Chef / ledning",
    skills: "Kompetenser",
    skillsNote: "— det viktigaste för din matchningspoäng",
    remove: (s: string) => `Ta bort ${s}`,
    noSkills: "Inga kompetenser än.",
    addPh: "Lägg till kompetenser, t.ex. Excel, SAP, inköp",
    addLabel: "Lägg till kompetenser",
    add: "Lägg till",
    looking: "Vad du letar efter",
    lookingNote: "Det här anpassar din ”För dig”-ranking. Att spara, söka och välja bort jobb finjusterar den med tiden.",
    roles: "Önskade roller",
    comma: "(kommaseparerade)",
    rolesPh: "Inköpare, Logistikkoordinator",
    suggested: "Förslag från ditt CV:",
    locations: "Önskade orter",
    salary: "Lägsta lön",
    perYear: "(per år)",
    remote: "Visa bara distansjobb",
    saving: "Sparar…",
    save: "Spara profil",
  },
});

type Profile = {
  name: string | null;
  skills: string[];
  years_experience: number | null;
  seniority: string | null;
  preferences: { locations?: string[]; remote_only?: boolean; target_titles?: string[]; salary_min?: number | null; suggested_roles?: string[] };
};

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40";

export function ProfileForm({ initial, hasResume }: { initial: Profile; hasResume: boolean }) {
  const t = T[useLocale()];
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // Upload feedback sits next to the upload box, not by the Save button far below.
  const [uploadMsg, setUploadMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [tips, setTips] = useState<{ improvements: string[]; roles: string[] } | null>(null);

  const [name, setName] = useState(initial.name ?? "");
  const [skills, setSkills] = useState(initial.skills);
  const [skillInput, setSkillInput] = useState("");
  const [years, setYears] = useState(initial.years_experience?.toString() ?? "");
  const [seniority, setSeniority] = useState(initial.seniority ?? "");
  const [titles, setTitles] = useState((initial.preferences.target_titles ?? []).join(", "));
  const [locations, setLocations] = useState((initial.preferences.locations ?? []).join(", "));
  const [remoteOnly, setRemoteOnly] = useState(Boolean(initial.preferences.remote_only));
  const [salary, setSalary] = useState(initial.preferences.salary_min?.toString() ?? "");

  const addSkills = (raw: string) => {
    const add = list(raw).filter((s) => !skills.some((k) => k.toLowerCase() === s.toLowerCase()));
    if (add.length) setSkills([...skills, ...add]);
    setSkillInput("");
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resume", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error ??
            (res.status === 413
              ? t.tooBig
              : res.status === 504
                ? t.tooSlow
                : t.failed(res.status)),
        );
      }
      const u = body.user;
      setName(u.name ?? name);
      setSkills(u.skills);
      setYears(u.years_experience?.toString() ?? "");
      setSeniority(u.seniority ?? "");
      setTitles((u.preferences.target_titles ?? []).join(", "));
      setTips({ improvements: body.improvements ?? [], roles: body.suggested_roles ?? [] });
      setUploadMsg({ kind: "ok", text: t.read });
      router.refresh();
    } catch (e) {
      setUploadMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (skillInput.trim()) addSkills(skillInput);
    start(async () => {
      setMsg(null);
      const allSkills = skillInput.trim() ? [...skills, ...list(skillInput)] : skills;
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(name.trim() ? { name: name.trim() } : {}),
          skills: allSkills,
          years_experience: years === "" ? null : Number(years),
          seniority: seniority || null,
          preferences: {
            target_titles: list(titles),
            locations: list(locations),
            remote_only: remoteOnly,
            salary_min: salary === "" ? null : Math.round(Number(salary)),
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: body.error === "Invalid request" ? t.checkValues : (body.error ?? t.couldNotSave) });
        return;
      }
      setMsg({ kind: "ok", text: t.saved });
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t.resume}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {hasResume ? t.resumeHas : t.resumeNew}
        </p>
        <label className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line px-4 py-8 text-center hover:border-accent/50 ${uploading ? "opacity-60" : ""}`}>
          <span className="text-sm font-medium">{uploading ? t.reading : t.choose}</span>
          <span className="mt-1 text-xs text-muted">{t.skip}</span>
          <input ref={fileRef} type="file" className="sr-only" disabled={uploading}
            accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {uploadMsg && (
          <p role={uploadMsg.kind === "err" ? "alert" : "status"} className={`mt-3 text-sm ${uploadMsg.kind === "ok" ? "text-accent" : "text-warn"}`}>
            {uploadMsg.text}
          </p>
        )}
        {tips && (tips.improvements.length > 0 || tips.roles.length > 0) && (
          <div className="mt-4 grid gap-4 rounded-xl bg-paper-2/60 p-4 text-sm sm:grid-cols-2">
            {tips.roles.length > 0 && (
              <div>
                <p className="font-medium">{t.rolesNow}</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-2">{tips.roles.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}
            {tips.improvements.length > 0 && (
              <div>
                <p className="font-medium">{t.stronger}</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-2">{tips.improvements.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t.about}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-3">
            <span className="text-ink-2">{t.name}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">{t.years}</span>
            <input type="number" min={0} max={60} step={0.5} value={years} onChange={(e) => setYears(e.target.value)} className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-2">{t.level}</span>
            <select value={seniority} onChange={(e) => setSeniority(e.target.value)} className={`${field} mt-1.5`}>
              <option value="">{t.notSet}</option>
              {(["intern", "junior", "mid", "senior", "lead", "executive"] as const).map((v) => (
                <option key={v} value={v}>{t[v]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          <p className="text-sm text-ink-2">{t.skills} <span className="text-muted">{t.skillsNote}</span></p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li key={s} className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-2.5 pr-1 text-xs font-medium text-accent">
                {skillLabel(s)}
                <button type="button" onClick={() => setSkills(skills.filter((k) => k !== s))} aria-label={t.remove(s)}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-accent/15">×</button>
              </li>
            ))}
            {skills.length === 0 && <li className="text-xs text-muted">{t.noSkills}</li>}
          </ul>
          <div className="mt-2 flex gap-2">
            <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkills(skillInput); } }}
              placeholder={t.addPh} aria-label={t.addLabel} className={field} />
            <button type="button" onClick={() => addSkills(skillInput)} className="rounded-xl border border-ink/20 px-4 text-sm hover:border-ink/50">{t.add}</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t.looking}</h2>
        <p className="mt-1 text-sm text-ink-2">{t.lookingNote}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-2">{t.roles} <span className="text-muted">{t.comma}</span></span>
            <input value={titles} onChange={(e) => setTitles(e.target.value)} placeholder={t.rolesPh} className={`${field} mt-1.5`} />
          </label>
          {initial.preferences.suggested_roles && initial.preferences.suggested_roles.length > 0 && (
            <p className="-mt-2 text-xs text-muted sm:col-span-2">{t.suggested} {initial.preferences.suggested_roles.join(", ")}</p>
          )}
          <label className="block text-sm">
            <span className="text-ink-2">{t.locations}</span>
            <input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Stockholm, Uppsala" className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">{t.salary} <span className="text-muted">{t.perYear}</span></span>
            <input type="number" min={0} step={1000} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="600000" className={`${field} mt-1.5`} />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2">
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            {t.remote}
          </label>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button disabled={pending || uploading} className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60">
          {pending ? t.saving : t.save}
        </button>
        {msg && <p role="status" className={`text-sm ${msg.kind === "ok" ? "text-accent" : "text-warn"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
