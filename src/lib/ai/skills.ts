/**
 * Skill normalization. Resumes and job posts spell the same skill many ways
 * ("ReactJS", "React.js", "react"); matching only works on a canonical form.
 */

const ALIASES: Record<string, string> = {
  "reactjs": "react",
  "react.js": "react",
  "react js": "react",
  "nextjs": "next.js",
  "next": "next.js",
  "next js": "next.js",
  "nodejs": "node.js",
  "node": "node.js",
  "node js": "node.js",
  "vuejs": "vue",
  "vue.js": "vue",
  "ts": "typescript",
  "js": "javascript",
  "es6": "javascript",
  "ecmascript": "javascript",
  "postgres": "postgresql",
  "psql": "postgresql",
  "mongo": "mongodb",
  "k8s": "kubernetes",
  "gcp": "google cloud",
  "google cloud platform": "google cloud",
  "amazon web services": "aws",
  "ms azure": "azure",
  "microsoft azure": "azure",
  "tailwind": "tailwind css",
  "tailwindcss": "tailwind css",
  "golang": "go",
  "c sharp": "c#",
  "csharp": "c#",
  "dotnet": ".net",
  "ml": "machine learning",
  "dl": "deep learning",
  "nlp": "natural language processing",
  "ux research": "user research",
  "ui design": "ui design",
  "ci/cd": "ci/cd",
  "cicd": "ci/cd",
  "rest": "rest api",
  "restful": "rest api",
  "restful api": "rest api",
  "gql": "graphql",
  "sklearn": "scikit-learn",
  "excel": "microsoft excel",
  "ms excel": "microsoft excel",
  "powerbi": "power bi",
  "microsoft power bi": "power bi",
  "sap erp": "sap",
  "sap s/4hana": "sap",
  "scm": "supply chain management",
  "supply chain management (scm)": "supply chain management",
  "s&op (sales and operations planning)": "s&op",
  "sales and operations planning": "s&op",
  "purchasing": "procurement",
  "inköp": "procurement",
  "upphandling": "procurement",
  "logistik": "logistics",
  "lagerhantering": "warehouse management",
  "lean": "lean manufacturing",
  "six sigma": "lean six sigma",
  "ms office": "microsoft office",
  "powerpoint": "microsoft powerpoint",
  "ms powerpoint": "microsoft powerpoint",
};

/**
 * Skills that imply partial credit for each other. If a job wants "sql" and the
 * user knows "postgresql", that's a strong partial match, not a miss.
 * Direction matters: key → skills that satisfy it partially.
 */
const RELATED: Record<string, string[]> = {
  "sql": ["postgresql", "mysql", "sql server", "sqlite", "oracle", "bigquery", "snowflake"],
  "postgresql": ["mysql", "sql server", "sql"],
  "mysql": ["postgresql", "sql server", "sql"],
  "javascript": ["typescript"],
  "typescript": ["javascript"],
  "react": ["vue", "angular", "svelte", "next.js"],
  "vue": ["react", "angular", "svelte"],
  "angular": ["react", "vue"],
  "next.js": ["react", "remix"],
  "aws": ["google cloud", "azure"],
  "google cloud": ["aws", "azure"],
  "azure": ["aws", "google cloud"],
  "docker": ["kubernetes", "podman"],
  "kubernetes": ["docker"],
  "python": ["django", "flask", "fastapi"],
  "machine learning": ["deep learning", "scikit-learn", "pytorch", "tensorflow"],
  "deep learning": ["pytorch", "tensorflow"],
  "pytorch": ["tensorflow"],
  "tensorflow": ["pytorch"],
  "figma": ["sketch", "adobe xd"],
  "tableau": ["power bi", "looker"],
  "power bi": ["tableau", "looker"],
  "spark": ["databricks", "hadoop"],
  "procurement": ["strategic procurement", "sourcing", "supplier management", "category management"],
  "strategic procurement": ["procurement", "sourcing", "category management"],
  "sourcing": ["procurement", "strategic procurement"],
  "logistics": ["supply chain management", "transport management", "warehouse management"],
  "supply chain management": ["logistics", "supply chain planning", "s&op"],
  "supply chain planning": ["s&op", "demand planning", "supply chain management"],
  "s&op": ["supply chain planning", "demand planning"],
  "warehouse management": ["logistics", "inventory management"],
  "inventory management": ["warehouse management", "supply chain planning"],
  "erp": ["sap", "oracle", "microsoft dynamics"],
  "microsoft office": ["microsoft excel", "microsoft powerpoint"],
};

export function normalizeSkill(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[-•*·\s]+|[.,;:\s]+$/g, "");
  return ALIASES[s] ?? s;
}

export function normalizeSkills(list: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of list) {
    const s = normalizeSkill(raw);
    if (s && s.length <= 60) out.add(s);
  }
  return [...out];
}

const words = (s: string) => s.split(/[\s/&,()-]+/).filter(Boolean);

/** True when every word of the (multi-word) `part` appears in `whole`. */
function containsPhrase(whole: string, part: string): boolean {
  const p = words(part);
  if (p.length < 2) return false; // single words like "management" would match too much
  const w = new Set(words(whole));
  return p.every((x) => w.has(x));
}

/** Credit (0–1) the user gets toward one required skill. */
export function skillCredit(jobSkill: string, userSkills: ReadonlySet<string>): number {
  if (userSkills.has(jobSkill)) return 1;
  let credit = 0;
  for (const u of userSkills) {
    // Job asks for the broader skill the user has a specific form of: "supply chain" ← "supply chain management".
    if (containsPhrase(u, jobSkill)) return 1;
    // Job asks for a narrower form: "supply chain planning" ← "supply chain". Related, not the same.
    if (containsPhrase(jobSkill, u)) credit = 0.5;
  }
  const related = RELATED[jobSkill];
  if (related?.some((r) => userSkills.has(r))) credit = Math.max(credit, 0.5);
  return credit;
}
