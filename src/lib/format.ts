export function timeAgo(d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return "";
  const s = Math.max(0, (now - new Date(d).getTime()) / 1000);
  if (s < 3600) return "just now";
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86_400);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export const SENIORITY_LABEL: Record<string, string> = {
  intern: "Intern", junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead", executive: "Executive",
};

export const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", applied: "Applied", interviewing: "Interviewing", offer: "Offer", rejected: "Rejected", withdrawn: "Withdrawn",
};

export const BREAKDOWN_LABEL: Record<string, string> = {
  skills: "Skills", semantic: "Background", experience: "Experience", seniority: "Seniority", location: "Location",
};

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
