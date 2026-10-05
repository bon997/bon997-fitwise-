import { describe, it, expect } from "vitest";
import {
  computeFitScore,
  computeResumeScore,
  scoreExperience,
  scoreLocation,
  scoreSeniority,
  scoreSkills,
  type FitJob,
  type FitProfile,
} from "@/lib/ai/fit-score";
import { normalizeSkill, normalizeSkills } from "@/lib/ai/skills";
import { parseRelativeDate, toYearly } from "@/lib/sources/types";
import { mapJSearchJob } from "@/lib/sources/rapidapi";
import { mapSerpJob } from "@/lib/sources/serpapi";
import { calibrate, cosine } from "@/lib/search/pinecone";

const frontendDev: FitProfile = {
  skills: ["TypeScript", "ReactJS", "Next.js", "Node", "Postgres", "Tailwind"],
  yearsExperience: 4.5,
  seniority: "mid",
  preferences: { locations: ["Stockholm"] },
};

const seniorFrontend: FitJob = {
  skills: [
    { name: "React", required: true },
    { name: "TypeScript", required: true },
    { name: "Next.js", required: true },
    { name: "GraphQL", required: false },
  ],
  minYears: 5,
  seniority: "senior",
  location: "Stockholm, Sweden",
  remote: false,
};

const dataEngineer: FitJob = {
  skills: ["python", "sql", "airflow", "dbt", "spark"].map((name) => ({ name, required: true })),
  minYears: 3,
  seniority: "mid",
  location: "Gothenburg",
  remote: false,
};

describe("skill normalization", () => {
  it("maps aliases to canonical names", () => {
    expect(normalizeSkill(" ReactJS ")).toBe("react");
    expect(normalizeSkill("Postgres")).toBe("postgresql");
    expect(normalizeSkill("K8s")).toBe("kubernetes");
    expect(normalizeSkill("• Node.js,")).toBe("node.js");
  });
  it("dedupes after normalizing", () => {
    expect(normalizeSkills(["React", "react.js", "ReactJS", ""])).toEqual(["react"]);
  });
});

describe("skills component", () => {
  it("weights required skills double and gives partial credit for related skills", () => {
    const r = scoreSkills(["postgresql", "python"], [
      { name: "SQL", required: true }, // partial via postgresql → 0.5 × 2
      { name: "Python", required: true }, // full → 2
      { name: "Spark", required: false }, // miss → 0 of 1
    ]);
    expect(r.matched).toEqual(["python"]);
    expect(r.partial).toEqual(["sql"]);
    expect(r.missing).toEqual(["spark"]);
    expect(r.missingRequired).toBe(0);
    expect(r.score).toBeCloseTo((3 / 5) * 100);
  });
  it("returns null when the job lists no skills", () => {
    expect(scoreSkills(["react"], []).score).toBeNull();
  });
});

describe("other components", () => {
  it("experience: shortfall is linear, overqualification softened, unknown neutral", () => {
    expect(scoreExperience(4, 5)).toBe(80);
    expect(scoreExperience(6, 5)).toBe(100);
    expect(scoreExperience(15, 5)).toBe(80);
    expect(scoreExperience(null, 5)).toBe(50);
    expect(scoreExperience(3, null)).toBeNull();
  });
  it("seniority: one level off is fine, three is a mismatch", () => {
    expect(scoreSeniority("mid", "mid")).toBe(100);
    expect(scoreSeniority("mid", "senior")).toBe(70);
    expect(scoreSeniority("junior", "lead")).toBe(0);
    expect(scoreSeniority(null, "lead")).toBeNull();
  });
  it("location: remote always fits; remote_only rejects onsite", () => {
    expect(scoreLocation({ locations: ["Stockholm"] }, { location: "Stockholm, SE", remote: false })).toBe(100);
    expect(scoreLocation({ locations: ["Stockholm"] }, { location: "Berlin", remote: false })).toBe(25);
    expect(scoreLocation({ remote_only: true }, { location: "Berlin", remote: false })).toBe(0);
    expect(scoreLocation({ remote_only: true }, { location: null, remote: true })).toBe(100);
    expect(scoreLocation({}, { location: "Berlin", remote: false })).toBeNull();
  });
});

describe("computeFitScore", () => {
  it("scores a strong frontend match high and a data role low", () => {
    const good = computeFitScore(frontendDev, seniorFrontend, 0.8);
    const bad = computeFitScore(frontendDev, dataEngineer, 0.2);
    expect(good.score).toBeGreaterThanOrEqual(80);
    expect(good.matchedSkills.sort()).toEqual(["next.js", "react", "typescript"]);
    expect(good.missingSkills).toEqual(["graphql"]);
    expect(bad.score).toBeLessThan(45);
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it("ignores components without data instead of counting them as zero", () => {
    const noSemantic = computeFitScore(frontendDev, seniorFrontend, null);
    expect(noSemantic.breakdown.semantic).toBeNull();
    expect(noSemantic.score).toBeGreaterThanOrEqual(80);
  });

  it("caps the total when required skills are missing", () => {
    const job: FitJob = { ...seniorFrontend, skills: [...seniorFrontend.skills, { name: "Kotlin", required: true }, { name: "Swift", required: true }] };
    const r = computeFitScore({ ...frontendDev, seniority: "senior", yearsExperience: 6 }, job, 1);
    expect(r.missingSkills).toEqual(expect.arrayContaining(["kotlin", "swift"]));
    expect(r.score).toBeLessThanOrEqual(76);
  });

  it("is always an integer in 0–100", () => {
    for (const sem of [null, 0, 0.5, 1]) {
      for (const job of [seniorFrontend, dataEngineer]) {
        const { score } = computeFitScore(frontendDev, job, sem);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("returns 0 when nothing can be compared", () => {
    const empty: FitJob = { skills: [], minYears: null, seniority: null, location: null, remote: false };
    expect(computeFitScore({ ...frontendDev, preferences: {} }, empty).score).toBe(0);
  });
});

describe("resume score", () => {
  it("rewards skills, described and dated roles", () => {
    const thin = computeResumeScore({ skills: ["react"], experience: [], yearsExperience: null });
    const full = computeResumeScore({
      skills: Array.from({ length: 15 }, (_, i) => `s${i}`),
      experience: Array.from({ length: 3 }, () => ({ title: "Dev", start: "2020-01", summary: "x".repeat(80) })),
      yearsExperience: 5,
    });
    expect(thin).toBeLessThan(10);
    expect(full).toBe(100);
  });
});

describe("job source normalization", () => {
  it("parses relative dates", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(parseRelativeDate("3 days ago", now)?.toISOString()).toBe("2026-09-28T12:00:00.000Z");
    expect(parseRelativeDate("an hour ago", now)?.toISOString()).toBe("2026-10-01T11:00:00.000Z");
    expect(parseRelativeDate("yesterday-ish", now)).toBeNull();
  });
  it("annualizes salaries", () => {
    expect(toYearly(50, "HOUR")).toBe(104000);
    expect(toYearly(5000, "MONTH")).toBe(60000);
    expect(toYearly(null, "YEAR")).toBeNull();
  });
  it("maps a JSearch job", () => {
    const j = mapJSearchJob({
      job_id: "abc", job_title: "Dev", employer_name: "Acme", job_city: "Stockholm", job_country: "SE",
      job_is_remote: false, job_employment_type: "FULLTIME", job_min_salary: 50000, job_max_salary: 60000,
      job_salary_currency: "EUR", job_salary_period: "YEAR",
      job_highlights: { Qualifications: ["React", "TS"], Responsibilities: ["Build UI"] },
      job_posted_at_datetime_utc: "2026-09-30T00:00:00Z",
    });
    expect(j).toMatchObject({
      source: "rapidapi", location: "Stockholm, SE", employmentType: "full_time",
      salaryMin: 50000, salaryMax: 60000, salaryRange: "50k–60k EUR / yr",
      requirements: "React\nTS", responsibilities: ["Build UI"],
    });
  });
  it("maps a SerpAPI job and detects remote", () => {
    const j = mapSerpJob({
      job_id: "x", title: "Dev", company_name: "Acme", location: "Anywhere",
      detected_extensions: { posted_at: "2 days ago", schedule_type: "Contractor" },
      job_highlights: [{ title: "Qualifications", items: ["Go"] }],
    });
    expect(j).toMatchObject({ remote: true, employmentType: "contract", requirements: "Go" });
    expect(j.postedAt).toBeInstanceOf(Date);
  });
});

describe("semantic helpers", () => {
  it("cosine and calibration", () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(calibrate(0.6)).toBe(0);
    expect(calibrate(0.95)).toBe(1);
    expect(calibrate(0.8)).toBeCloseTo(0.5);
  });
});
