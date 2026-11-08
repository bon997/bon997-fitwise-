/**
 * "My priorities": a personal points list on top of the fit score.
 *
 * Each rule adds its points when it matches a job; jobs can then be sorted by
 * the total, highest first. Rules live in users.preferences.priorities (no
 * extra table) and are matched in code, so ranking is instant and free.
 *
 *   title   – a term appears in the job title           ("Logistics Coordinator")
 *   text    – a term appears anywhere in the ad/skills  ("SAP", "Power BI")
 *   english – the ad is written in English or asks for English as the working language
 *   remote  – the job is remote or hybrid
 *
 * Terms of 5+ letters match inside words too, so Swedish compounds work
 * ("transportplanerare" contains "transportplaner"); shorter ones (SAP, BI)
 * must stand alone.
 */
import { z } from "zod";
import type { JobSkill } from "./ai/fit-score";

export const PRIORITY_MATCH = ["title", "text", "english", "remote"] as const;
export type PriorityMatch = (typeof PRIORITY_MATCH)[number];

export const PriorityRule = z.object({
  label: z.string().trim().min(1).max(60),
  points: z.number().int().min(-50).max(100),
  match: z.enum(PRIORITY_MATCH),
  terms: z.array(z.string().trim().toLowerCase().min(1).max(60)).max(20).default([]),
});
export type PriorityRule = z.infer<typeof PriorityRule>;
export const PriorityRules = z.array(PriorityRule).max(25);

/** The supply-chain list: titles and skills with Swedish and English wording. */
export const SUPPLY_CHAIN_PRESET: PriorityRule[] = [
  { label: "Logistics Coordinator", points: 30, match: "title", terms: ["logistics coordinator", "logistikkoordinator", "logistiksamordnare", "logistik koordinator", "koordinator logistik", "logistics co-ordinator"] },
  { label: "Supply Chain Coordinator", points: 25, match: "title", terms: ["supply chain coordinator", "supply chain-koordinator", "supply chain koordinator", "supply chain samordnare", "scm coordinator"] },
  { label: "SAP experience", points: 20, match: "text", terms: ["sap", "sap s/4", "s/4hana", "sap mm", "sap sd", "sap ewm"] },
  { label: "Power BI", points: 15, match: "text", terms: ["power bi", "powerbi"] },
  { label: "Excel (advanced)", points: 15, match: "text", terms: ["avancerad excel", "advanced excel", "excel på avancerad nivå", "goda kunskaper i excel", "excelkunskaper", "vba", "pivot", "power query"] },
  { label: "Procurement", points: 15, match: "text", terms: ["procurement", "purchasing", "inköp", "upphandling"] },
  { label: "Transport planning", points: 15, match: "text", terms: ["transport planning", "transport planner", "transportplanering", "transportplanerare", "trafikplanerare", "trafikledare"] },
  { label: "Warehouse administration", points: 10, match: "text", terms: ["warehouse administration", "warehouse administrator", "lageradministration", "lageradministratör", "lageradministrativ"] },
  { label: "English-speaking job", points: 10, match: "english", terms: [] },
  { label: "Hybrid / remote", points: 10, match: "remote", terms: [] },
];

export type PriorityJob = {
  title: string;
  description?: string | null;
  requirements?: string | null;
  skills?: JobSkill[] | null;
  remote: boolean;
};

export type PriorityResult = { score: number; hits: { label: string; points: number }[] };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when `term` occurs in `text` (both lower case): inside words for 5+ letters, as a whole word otherwise. */
export function hasTerm(text: string, term: string): boolean {
  if (!term) return false;
  if (term.length >= 5) return text.includes(term);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(term)}($|[^\\p{L}\\p{N}])`, "u").test(text);
}

const EN = /\b(the|and|you|your|with|for|our|will|we|are|of|to|in|this|role)\b/g;
const SV = /(^|[^\p{L}])(och|att|du|dig|med|för|vi|som|är|på|av|det|en|ett|hos|till|inom)(?=$|[^\p{L}])/gu;
const ENGLISH_WORKPLACE = /english[- ]speaking|working language is english|business language is english|engelska som (arbets|koncern)språk|arbetsspråket är engelska|fluent (in )?english/;

/** Ad written in English (more English than Swedish function words), or English named as the working language. */
export function isEnglishJob(text: string): boolean {
  if (ENGLISH_WORKPLACE.test(text)) return true;
  const en = text.match(EN)?.length ?? 0;
  const sv = text.match(SV)?.length ?? 0;
  return en >= 8 && en > sv * 1.5;
}

const REMOTE = /hybrid|distans|remote|hemifrån|work from home|wfh/;

export function scorePriorities(job: PriorityJob, rules: PriorityRule[] | undefined | null): PriorityResult {
  if (!rules?.length) return { score: 0, hits: [] };
  const title = job.title.toLowerCase();
  const skills = (job.skills ?? []).map((s) => s.name).join(" , ");
  const text = `${title}\n${job.requirements ?? ""}\n${job.description ?? ""}\n${skills}`.toLowerCase();

  const hits: PriorityResult["hits"] = [];
  for (const r of rules) {
    const terms = r.terms.length ? r.terms : [r.label.toLowerCase()];
    const ok =
      r.match === "title" ? terms.some((t) => hasTerm(title, t))
      : r.match === "text" ? terms.some((t) => hasTerm(text, t))
      : r.match === "english" ? isEnglishJob(text)
      : job.remote || REMOTE.test(text);
    if (ok) hits.push({ label: r.label, points: r.points });
  }
  return { score: hits.reduce((s, h) => s + h.points, 0), hits: hits.sort((a, b) => b.points - a.points) };
}

/** Highest total a job could reach with these rules (for showing "85 of 165"). */
export const maxPriority = (rules: PriorityRule[]) => rules.reduce((s, r) => s + Math.max(0, r.points), 0);
