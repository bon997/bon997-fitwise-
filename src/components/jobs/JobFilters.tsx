"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { labels, skillLabel } from "@/lib/format";
import type { JobFacets } from "@/lib/job-search";
import { searchMatch } from "@/lib/search-match";

const REGION = "r:";

const T = defineT({
  en: {
    keywordsPh: "Search one or more words, e.g. warehouse Malmö",
    keywords: "Keywords",
    search: "Search",
    ort: "Location",
    skill: "Skills",
    filter: "Filters",
    clear: "Clear",
    findPlace: "Find a town or county",
    findSkill: "Find a skill",
    wholeRegion: (r: string) => `All of ${r}`,
    other: "Other places",
    yourSkills: "Your skills",
    popular: "Most common in the ads",
    noMatch: "Nothing matches.",
    type: "Employment type",
    level: "Level",
    posted: "Published",
    anyTime: "Any time",
    d1: "Last 24 hours",
    d7: "Last 7 days",
    d30: "Last 30 days",
    remote: "Remote",
    remoteOnly: "Remote jobs only",
    fit: "Your match",
    anyFit: "Any match",
    fitAtLeast: (n: number) => `${n} or higher`,
    apply: "Show jobs",
    close: "Close",
    remove: (x: string) => `Remove filter ${x}`,
    sortBy: "Sort by",
    forYou: "For you",
    relevant: "Most relevant",
    bestFit: "Best fit",
    newest: "Newest",
    salary: "Highest salary",
    within: (d: number) => (d === 1 ? "Last 24 hours" : `Last ${d} days`),
    minFit: (n: number) => `Match ${n}+`,
  },
  sv: {
    keywordsPh: "Sök på ett eller flera ord, t.ex. lager Malmö",
    keywords: "Sökord",
    search: "Sök",
    ort: "Ort",
    skill: "Kompetens",
    filter: "Filter",
    clear: "Rensa",
    findPlace: "Sök kommun eller län",
    findSkill: "Sök kompetens",
    wholeRegion: (r: string) => `Hela ${r}`,
    other: "Övriga orter",
    yourSkills: "Dina kompetenser",
    popular: "Vanligast i annonserna",
    noMatch: "Inga träffar.",
    type: "Anställningsform",
    level: "Nivå",
    posted: "Publicerad",
    anyTime: "När som helst",
    d1: "Senaste dygnet",
    d7: "Senaste 7 dagarna",
    d30: "Senaste 30 dagarna",
    remote: "Distans",
    remoteOnly: "Endast distansjobb",
    fit: "Din matchning",
    anyFit: "Alla",
    fitAtLeast: (n: number) => `${n} eller högre`,
    apply: "Visa jobb",
    close: "Stäng",
    remove: (x: string) => `Ta bort filtret ${x}`,
    sortBy: "Sortera efter",
    forYou: "För dig",
    relevant: "Mest relevanta",
    bestFit: "Bäst matchning",
    newest: "Nyaste",
    salary: "Högst lön",
    within: (d: number) => (d === 1 ? "Senaste dygnet" : `Senaste ${d} dagarna`),
    minFit: (n: number) => `Matchning ${n}+`,
  },
});

export type FilterValues = {
  q?: string;
  ort?: string[];
  skill?: string[];
  type?: string[];
  seniority?: string[];
  posted_within?: number;
  remote?: boolean;
  min_fit?: number;
  sort: string;
  location?: string;
};

type Menu = "ort" | "skill" | "filter" | null;

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40";

export function JobFilters({
  values,
  facets,
  userSkills,
  personal,
}: {
  values: FilterValues;
  facets: JobFacets;
  userSkills: string[];
  personal: boolean;
}) {
  const locale = useLocale();
  const t = T[locale];
  const L = labels(locale);
  const form = useRef<HTMLFormElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Menu>(null);

  // Close on Escape or a click outside the menus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const submit = () => form.current?.requestSubmit();
  const uncheck = (name: string, value: string) => {
    form.current
      ?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)
      .forEach((el) => {
        if (el.value === value) el.checked = false;
      });
    submit();
  };
  const clearField = (name: string) => {
    form.current?.querySelectorAll<HTMLInputElement>(`[name="${name}"]`).forEach((el) => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = el.value === "";
      else el.value = "";
    });
    submit();
  };

  const filterCount =
    (values.type?.length ?? 0) +
    (values.seniority?.length ?? 0) +
    (values.posted_within ? 1 : 0) +
    (values.remote ? 1 : 0) +
    (values.min_fit ? 1 : 0);

  const chips: { label: string; onRemove: () => void }[] = [
    ...(values.ort ?? []).map((o) => ({
      label: o.startsWith(REGION) ? o.slice(REGION.length) : o,
      onRemove: () => uncheck("ort", o),
    })),
    ...(values.skill ?? []).map((s) => ({ label: skillLabel(s), onRemove: () => uncheck("skill", s) })),
    ...(values.type ?? []).map((v) => ({ label: L.type[v as keyof typeof L.type] ?? v, onRemove: () => uncheck("type", v) })),
    ...(values.seniority ?? []).map((v) => ({
      label: L.seniority[v as keyof typeof L.seniority] ?? v,
      onRemove: () => uncheck("seniority", v),
    })),
    ...(values.posted_within ? [{ label: t.within(values.posted_within), onRemove: () => clearField("posted_within") }] : []),
    ...(values.remote ? [{ label: t.remote, onRemove: () => uncheck("remote", "true") }] : []),
    ...(values.min_fit ? [{ label: t.minFit(values.min_fit), onRemove: () => clearField("min_fit") }] : []),
    ...(values.location ? [{ label: values.location, onRemove: () => clearField("location") }] : []),
  ];

  const toggle = (m: Exclude<Menu, null>) => setOpen((cur) => (cur === m ? null : m));

  return (
    <form
      ref={form}
      action="/jobs"
      method="get"
      role="search"
      // Leave empty fields out of the link, so it reads /jobs?ort=Solna rather than /jobs?q=&ort=Solna.
      onSubmit={(e) =>
        e.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[name], select[name]").forEach((el) => {
          if (el.value === "") el.disabled = true;
        })
      }
      className="mt-6 rounded-2xl bg-ink p-4 text-paper sm:p-6">
      <label htmlFor="q" className="text-sm font-medium">
        {t.keywords}
      </label>
      <div className="mt-2 flex overflow-hidden rounded-xl bg-white focus-within:ring-2 focus-within:ring-accent-soft focus-within:ring-offset-2 focus-within:ring-offset-ink">
        <input
          id="q"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder={t.keywordsPh}
          className="min-w-0 flex-1 bg-white px-4 py-3 text-base text-ink outline-none placeholder:text-muted"
        />
        <button className="flex shrink-0 items-center gap-2 bg-accent px-4 py-3 min-[400px]:px-5 text-base font-medium text-paper hover:opacity-90 sm:px-8">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" strokeLinecap="round" />
          </svg>
          <span className="sr-only min-[400px]:not-sr-only">{t.search}</span>
        </button>
      </div>
      {values.location && <input type="hidden" name="location" value={values.location} />}

      <div ref={bar} className="relative mt-4 flex flex-wrap items-center gap-2">
        <MenuButton label={t.ort} count={values.ort?.length ?? 0} open={open === "ort"} onClick={() => toggle("ort")} />
        <MenuButton label={t.skill} count={values.skill?.length ?? 0} open={open === "skill"} onClick={() => toggle("skill")} />
        <MenuButton label={t.filter} count={filterCount} open={open === "filter"} onClick={() => toggle("filter")} />
        {(chips.length > 0 || values.q) && (
          <Link href="/jobs" className="ml-1 flex items-center gap-1 px-2 py-2 text-sm text-paper/85 hover:text-paper">
            <span aria-hidden>✕</span> {t.clear}
          </Link>
        )}

        {open && <div aria-hidden onClick={() => setOpen(null)} className="fixed inset-0 z-40 bg-ink/40 sm:hidden" />}
        {/* Panels stay mounted (just hidden) so every ticked box is sent with the search. */}
        <Panel open={open === "ort"} title={t.ort} onClose={() => setOpen(null)} closeLabel={t.close} applyLabel={t.apply}>
          <PlacePicker places={facets.places} selected={values.ort ?? []} t={t} />
        </Panel>
        <Panel open={open === "skill"} title={t.skill} onClose={() => setOpen(null)} closeLabel={t.close} applyLabel={t.apply}>
          <SkillPicker skills={facets.skills} userSkills={userSkills} selected={values.skill ?? []} t={t} />
        </Panel>
        <Panel open={open === "filter"} title={t.filter} onClose={() => setOpen(null)} closeLabel={t.close} applyLabel={t.apply}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Group title={t.type}>
              {Object.entries(L.type).map(([v, l]) => (
                <Check key={v} name="type" value={v} label={l} count={facets.types[v] ?? 0} checked={values.type?.includes(v)} />
              ))}
            </Group>
            <Group title={t.level}>
              {Object.entries(L.seniority).map(([v, l]) => (
                <Check key={v} name="seniority" value={v} label={l} count={facets.seniority[v] ?? 0} checked={values.seniority?.includes(v)} />
              ))}
            </Group>
            <Group title={t.posted}>
              {([["", t.anyTime], ["1", t.d1], ["7", t.d7], ["30", t.d30]] as const).map(([v, l]) => (
                <Radio key={v} name="posted_within" value={v} label={l} checked={String(values.posted_within ?? "") === v} />
              ))}
            </Group>
            <div className="space-y-5">
              <Group title={t.remote}>
                <Check name="remote" value="true" label={t.remoteOnly} checked={values.remote === true} />
              </Group>
              {personal && (
                <Group title={t.fit}>
                  {([["", t.anyFit], ["50", t.fitAtLeast(50)], ["70", t.fitAtLeast(70)], ["85", t.fitAtLeast(85)]] as const).map(([v, l]) => (
                    <Radio key={v} name="min_fit" value={v} label={l} checked={String(values.min_fit ?? "") === v} />
                  ))}
                </Group>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.label}>
              <button
                type="button"
                onClick={c.onRemove}
                aria-label={t.remove(c.label)}
                className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-sm text-ink hover:bg-paper-2"
              >
                {c.label} <span aria-hidden className="text-muted">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Sort travels with the form; changing it re-runs the search. */}
      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <label htmlFor="sort" className="text-paper/80">
          {t.sortBy}
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={values.sort}
          onChange={submit}
          className="rounded-lg border border-paper/30 bg-ink px-2 py-1.5 text-paper"
        >
          {personal && <option value="for_you">{t.forYou}</option>}
          <option value="relevance">{t.relevant}</option>
          {personal && <option value="fit">{t.bestFit}</option>}
          <option value="recent">{t.newest}</option>
          <option value="salary">{t.salary}</option>
        </select>
      </div>
    </form>
  );
}

function MenuButton({ label, count, open, onClick }: { label: string; count: number; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-base font-medium transition ${
        open || count > 0 ? "border-paper bg-paper text-ink" : "border-paper/50 hover:border-paper"
      }`}
    >
      {label}
      {count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs leading-5 text-paper">{count}</span>}
      <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Panel({
  open,
  title,
  onClose,
  closeLabel,
  applyLabel,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  closeLabel: string;
  applyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      hidden={!open}
      role="dialog"
      aria-label={title}
      className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white text-ink shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:max-h-[70vh] sm:w-[36rem] sm:rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="font-semibold">{title}</p>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
          {closeLabel} ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      <div className="border-t border-line px-5 py-3">
        <button className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink-2">{applyLabel}</button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="mt-2 space-y-1">{children}</div>
    </fieldset>
  );
}

function Check({ name, value, label, count, checked }: { name: string; value: string; label: string; count?: number; checked?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm hover:bg-paper-2 ${count === 0 && !checked ? "text-muted" : ""}`}>
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="tabular-nums text-xs text-muted">({count})</span>}
    </label>
  );
}

function Radio({ name, value, label, checked }: { name: string; value: string; label: string; checked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm hover:bg-paper-2">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="h-4 w-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}

function PlacePicker({ places, selected, t }: { places: JobFacets["places"]; selected: string[]; t: (typeof T)["sv"] }) {
  const [find, setFind] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Group towns under their county (län), biggest first.
  const groups = useMemo(() => {
    const byRegion = new Map<string, { region: string | null; total: number; towns: Map<string, number> }>();
    // A town listed without a county (Google Jobs: "Stockholm, Sweden") joins the county it's known under.
    const home = new Map(places.filter((p) => p.region).map((p) => [p.town.toLowerCase(), p.region!]));
    for (const p of [...places].sort((a, b) => Number(!a.region) - Number(!b.region))) {
      const known = !p.region ? home.get(p.town.toLowerCase()) : undefined;
      if (known) {
        const g = byRegion.get(known)!;
        const town = [...g.towns.keys()].find((x) => x.toLowerCase() === p.town.toLowerCase())!;
        g.towns.set(town, g.towns.get(town)! + p.count);
        continue;
      }
      const key = p.region ?? "";
      const g = byRegion.get(key) ?? { region: p.region, total: 0, towns: new Map() };
      g.total += p.count;
      g.towns.set(p.town, (g.towns.get(p.town) ?? 0) + p.count);
      byRegion.set(key, g);
    }
    // Keep selections visible even when they currently have no jobs.
    for (const s of selected) {
      if (s.startsWith(REGION)) {
        const r = s.slice(REGION.length);
        if (![...byRegion.values()].some((g) => g.region?.toLowerCase() === r.toLowerCase())) byRegion.set(r, { region: r, total: 0, towns: new Map() });
      } else if (![...byRegion.values()].some((g) => [...g.towns.keys()].some((x) => x.toLowerCase() === s.toLowerCase()))) {
        const g = byRegion.get("") ?? { region: null, total: 0, towns: new Map() };
        g.towns.set(s, 0);
        byRegion.set("", g);
      }
    }
    return [...byRegion.values()]
      .map((g) => ({ ...g, towns: [...g.towns.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sv")) }))
      .sort((a, b) => (a.region === null ? 1 : b.region === null ? -1 : b.total - a.total));
  }, [places, selected]);

  const isSel = (v: string) => selected.some((s) => s.toLowerCase() === v.toLowerCase());
  const f = find.trim();
  const visible = groups
    .map((g) => {
      const regionHit = !f || (g.region && searchMatch(g.region, f));
      const towns = regionHit ? g.towns : g.towns.filter(([town]) => searchMatch(town, f));
      return { ...g, towns, show: regionHit || towns.length > 0 };
    })
    .filter((g) => g.show);

  return (
    <div>
      <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={t.findPlace} aria-label={t.findPlace} className={input} />
      {visible.length === 0 && <p className="mt-3 text-sm text-muted">{t.noMatch}</p>}
      <ul className="mt-3 space-y-1">
        {visible.map((g) => {
          const key = g.region ?? "";
          const open = Boolean(f) || g.region === null || expanded.has(key) || g.towns.some(([town]) => isSel(town));
          return (
            <li key={key} className="rounded-xl border border-line">
              {g.region ? (
                <div className="flex items-center">
                  <div className="min-w-0 flex-1">
                    <Check name="ort" value={REGION + g.region} label={t.wholeRegion(g.region)} count={g.total} checked={isSel(REGION + g.region)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                    aria-expanded={open}
                    aria-label={g.region}
                    className="px-3 py-1.5 text-muted hover:text-ink"
                  >
                    <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{t.other}</p>
              )}
              {/* Hidden towns keep their checkbox so a ticked town isn't lost when its county is collapsed. */}
              <div hidden={!open} className={`grid gap-x-3 px-2 pb-2 sm:grid-cols-2 ${g.region ? "border-t border-line pt-1" : ""}`}>
                {g.towns.map(([town, n]) => (
                  <Check key={town} name="ort" value={town} label={town} count={n} checked={isSel(town)} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {/* Selections filtered out by the search box still need to be submitted. */}
      {f &&
        selected
          .filter((s) => !visible.some((g) => (g.region && REGION + g.region === s) || g.towns.some(([town]) => town === s)))
          .map((s) => <input key={s} type="hidden" name="ort" value={s} />)}
    </div>
  );
}

function SkillPicker({
  skills,
  userSkills,
  selected,
  t,
}: {
  skills: JobFacets["skills"];
  userSkills: string[];
  selected: string[];
  t: (typeof T)["sv"];
}) {
  const [find, setFind] = useState("");
  const counts = new Map(skills.map((s) => [s.skill, s.count]));
  const mine = [...new Set(userSkills.map((s) => s.toLowerCase()))];
  const sel = new Set(selected.map((s) => s.toLowerCase()));
  const popular = skills.map((s) => s.skill).filter((s) => !mine.includes(s));
  // A chosen skill that no longer appears in any ad stays in the list so it can be unticked.
  for (const s of sel) if (!mine.includes(s) && !popular.includes(s)) popular.unshift(s);

  const f = find.trim();
  const match = (s: string) => !f || searchMatch(s, f) || searchMatch(skillLabel(s), f);
  const mineShown = mine.filter(match);
  const popularShown = popular.filter(match);
  const hidden = [...sel].filter((s) => !mineShown.includes(s) && !popularShown.includes(s));

  return (
    <div>
      <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={t.findSkill} aria-label={t.findSkill} className={input} />
      {mineShown.length + popularShown.length === 0 && <p className="mt-3 text-sm text-muted">{t.noMatch}</p>}
      {mineShown.length > 0 && (
        <div className="mt-4">
          <Group title={t.yourSkills}>
            <div className="grid gap-x-3 sm:grid-cols-2">
              {mineShown.map((s) => (
                <Check key={s} name="skill" value={s} label={skillLabel(s)} count={counts.get(s) ?? 0} checked={sel.has(s)} />
              ))}
            </div>
          </Group>
        </div>
      )}
      {popularShown.length > 0 && (
        <div className="mt-4">
          <Group title={t.popular}>
            <div className="grid gap-x-3 sm:grid-cols-2">
              {popularShown.map((s) => (
                <Check key={s} name="skill" value={s} label={skillLabel(s)} count={counts.get(s) ?? 0} checked={sel.has(s)} />
              ))}
            </div>
          </Group>
        </div>
      )}
      {hidden.map((s) => (
        <input key={s} type="hidden" name="skill" value={s} />
      ))}
    </div>
  );
}
