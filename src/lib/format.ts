import { defineT, type Locale } from "@/i18n/config";

export function timeAgo(d: Date | string | null | undefined, locale: Locale = "en", now = Date.now()): string {
  if (!d) return "";
  const sv = locale === "sv";
  const s = Math.max(0, (now - new Date(d).getTime()) / 1000);
  if (s < 3600) return sv ? "nyss" : "just now";
  if (s < 86_400) {
    const h = Math.floor(s / 3600);
    return sv ? `för ${h} tim sedan` : `${h}h ago`;
  }
  const days = Math.floor(s / 86_400);
  if (days === 1) return sv ? "i går" : "yesterday";
  if (days < 30) return sv ? `för ${days} dagar sedan` : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (sv) return months === 1 ? "för 1 månad sedan" : `för ${months} månader sedan`;
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/** "Posted 3 days ago" / "Publicerad för 3 dagar sedan". */
export const postedAgo = (d: Date | string | null | undefined, locale: Locale = "en") =>
  d ? `${locale === "sv" ? "Publicerad" : "Posted"} ${timeAgo(d, locale)}` : null;

const LABELS = defineT({
  en: {
    seniority: { intern: "Intern", junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead", executive: "Executive" } as Record<string, string>,
    type: { full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" } as Record<string, string>,
    status: { draft: "Draft", applied: "Applied", interviewing: "Interviewing", offer: "Offer", rejected: "Rejected", withdrawn: "Withdrawn" } as Record<string, string>,
    breakdown: { skills: "Skills", semantic: "Background", experience: "Experience", seniority: "Seniority", location: "Location" } as Record<string, string>,
    remote: "Remote",
  },
  sv: {
    seniority: { intern: "Praktikant", junior: "Junior", mid: "Erfaren", senior: "Senior", lead: "Ledande", executive: "Chef" },
    type: { full_time: "Heltid", part_time: "Deltid", contract: "Visstid", internship: "Praktik" },
    status: { draft: "Utkast", applied: "Sökt", interviewing: "Intervju", offer: "Erbjudande", rejected: "Avslag", withdrawn: "Återkallad" },
    breakdown: { skills: "Kompetenser", semantic: "Bakgrund", experience: "Erfarenhet", seniority: "Nivå", location: "Plats" },
    remote: "Distans",
  },
});

export const labels = (locale: Locale) => LABELS[locale];

/** English labels, kept for code that has no locale (e.g. API responses). */
export const SENIORITY_LABEL = LABELS.en.seniority;
export const TYPE_LABEL = LABELS.en.type;
export const STATUS_LABEL = LABELS.en.status;
export const BREAKDOWN_LABEL = LABELS.en.breakdown;

const ACRONYMS = new Set(["sap", "erp", "wms", "tms", "kpi", "kpis", "crm", "iso", "bi", "api", "hr", "it", "qa", "ux", "ui", "seo", "gdpr", "b2b", "b2c", "edi", "mrp", "plm", "aws", "gcp", "sla", "rfq", "rfp", "3pl", "fmcg", "vba", "ai", "ml"]);

/** Capitalize normalized skill names for display ("next.js" stays, "react" → "React"). */
export function skillLabel(s: string): string {
  const special: Record<string, string> = {
    "aws": "AWS", "sql": "SQL", "graphql": "GraphQL", "postgresql": "PostgreSQL", "typescript": "TypeScript",
    "javascript": "JavaScript", "node.js": "Node.js", "next.js": "Next.js", "ci/cd": "CI/CD", "dbt": "dbt",
    "rest api": "REST API", "mysql": "MySQL", "mongodb": "MongoDB", "ui design": "UI design", "c#": "C#",
    "s&op": "S&OP", "lean six sigma": "Lean Six Sigma",
  };
  if (special[s]) return special[s];
  // Short all-letter words are usually acronyms: SAP, ERP, WMS, KPI, CRM, ISO, BI.
  return s
    .split(" ")
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");
}

/** A "For you" reason in the reader's language (falls back to the English text). */
export function reasonText(r: { text: string; code?: string; arg?: string }, locale: Locale): string {
  if (locale !== "sv" || !r.code) return r.text;
  const level = r.arg ? (LABELS.sv.seniority as Record<string, string>)[r.arg] ?? r.arg : "";
  switch (r.code) {
    case "hidden_company": return `Du har dolt jobb från ${r.arg}`;
    case "target_role": return "Matchar en roll du siktar på";
    case "similar_saved": return "Liknar jobb du sparat eller sökt";
    case "below_salary": return "Lönen är under ditt minimum";
    case "meets_salary": return "Uppfyller ditt lönekrav";
    case "dismissed_role": return "Liknar roller du valt bort";
    case "passed_city": return `Du har valt bort jobb i ${r.arg}`;
    case "passed_level": return `Du har valt bort roller på nivån ${level.toLowerCase()}`;
    default: return r.text;
  }
}
