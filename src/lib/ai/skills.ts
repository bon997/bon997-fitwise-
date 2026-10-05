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

/** Credit (0–1) the user gets toward one required skill. */
export function skillCredit(jobSkill: string, userSkills: ReadonlySet<string>): number {
  if (userSkills.has(jobSkill)) return 1;
  const related = RELATED[jobSkill];
  if (related?.some((r) => userSkills.has(r))) return 0.5;
  return 0;
}
