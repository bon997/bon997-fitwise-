"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { skillLabel } from "@/lib/format";

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
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
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
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resume", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Upload failed");
      const u = body.user;
      setName(u.name ?? name);
      setSkills(u.skills);
      setYears(u.years_experience?.toString() ?? "");
      setSeniority(u.seniority ?? "");
      setTitles((u.preferences.target_titles ?? []).join(", "));
      setTips({ improvements: body.improvements ?? [], roles: body.suggested_roles ?? [] });
      setMsg({ kind: "ok", text: "Resume read. Check the skills below and fix anything we got wrong." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
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
        setMsg({ kind: "err", text: body.error === "Invalid request" ? "Please check the highlighted values." : (body.error ?? "Could not save") });
        return;
      }
      setMsg({ kind: "ok", text: "Saved. Your matches are updated." });
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Resume</h2>
        <p className="mt-1 text-sm text-ink-2">
          {hasResume ? "Upload a newer version any time; your skills are re-read from it." : "Upload your resume and we'll fill in your skills and experience. PDF, Word or text, up to 5 MB."}
        </p>
        <label className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line px-4 py-8 text-center hover:border-accent/50 ${uploading ? "opacity-60" : ""}`}>
          <span className="text-sm font-medium">{uploading ? "Reading your resume…" : "Choose a file"}</span>
          <span className="mt-1 text-xs text-muted">or skip this and add skills by hand below</span>
          <input ref={fileRef} type="file" className="sr-only" disabled={uploading}
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {tips && (tips.improvements.length > 0 || tips.roles.length > 0) && (
          <div className="mt-4 grid gap-4 rounded-xl bg-paper-2/60 p-4 text-sm sm:grid-cols-2">
            {tips.roles.length > 0 && (
              <div>
                <p className="font-medium">Roles you fit now</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-2">{tips.roles.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}
            {tips.improvements.length > 0 && (
              <div>
                <p className="font-medium">Make your resume stronger</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-2">{tips.improvements.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">About you</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-3">
            <span className="text-ink-2">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Years of experience</span>
            <input type="number" min={0} max={60} step={0.5} value={years} onChange={(e) => setYears(e.target.value)} className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-2">Level</span>
            <select value={seniority} onChange={(e) => setSeniority(e.target.value)} className={`${field} mt-1.5`}>
              <option value="">Not set</option>
              <option value="intern">Intern</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
              <option value="executive">Executive</option>
            </select>
          </label>
        </div>

        <div className="mt-5">
          <p className="text-sm text-ink-2">Skills <span className="text-muted">— the most important input for your fit score</span></p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li key={s} className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-2.5 pr-1 text-xs font-medium text-accent">
                {skillLabel(s)}
                <button type="button" onClick={() => setSkills(skills.filter((k) => k !== s))} aria-label={`Remove ${s}`}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-accent/15">×</button>
              </li>
            ))}
            {skills.length === 0 && <li className="text-xs text-muted">No skills yet.</li>}
          </ul>
          <div className="mt-2 flex gap-2">
            <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkills(skillInput); } }}
              placeholder="Add skills, e.g. React, SQL, Figma" aria-label="Add skills" className={field} />
            <button type="button" onClick={() => addSkills(skillInput)} className="rounded-xl border border-ink/20 px-4 text-sm hover:border-ink/50">Add</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">What you&apos;re looking for</h2>
        <p className="mt-1 text-sm text-ink-2">These tailor your &quot;For you&quot; ranking. Saving, applying and passing on jobs tunes it further over time.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-2">Target roles <span className="text-muted">(comma-separated)</span></span>
            <input value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="Frontend Engineer, Product Engineer" className={`${field} mt-1.5`} />
          </label>
          {initial.preferences.suggested_roles && initial.preferences.suggested_roles.length > 0 && (
            <p className="-mt-2 text-xs text-muted sm:col-span-2">Suggested from your resume: {initial.preferences.suggested_roles.join(", ")}</p>
          )}
          <label className="block text-sm">
            <span className="text-ink-2">Preferred locations</span>
            <input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Stockholm, Uppsala" className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Minimum salary <span className="text-muted">(per year)</span></span>
            <input type="number" min={0} step={1000} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="600000" className={`${field} mt-1.5`} />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2">
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            Only show me remote jobs
          </label>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button disabled={pending || uploading} className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-60">
          {pending ? "Saving…" : "Save profile"}
        </button>
        {msg && <p role="status" className={`text-sm ${msg.kind === "ok" ? "text-accent" : "text-warn"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
