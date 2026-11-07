import { describe, it, expect } from "vitest";
import { computeResumeScore } from "@/lib/ai/fit-score";
import { bestProfileStep, nextAction, profileChecklist } from "@/lib/next-action";

const demo = {
  skills: ["typescript", "react", "next.js", "node.js", "postgresql", "tailwind css", "figma"],
  experience: [{ title: "Frontend Developer", start: "2021-03", summary: "Built the customer dashboard in React and Next.js" }],
  yearsExperience: 4.5,
};

describe("profileChecklist", () => {
  it("adds up to exactly what profile strength is missing", () => {
    const strength = computeResumeScore(demo);
    const items = profileChecklist({ ...demo, locations: ["Stockholm"], remoteOnly: false });
    const gain = items.reduce((s, i) => s + i.gain, 0);
    expect(strength + gain).toBe(100);
  });

  it("picks the step worth the most points", () => {
    const items = profileChecklist({ ...demo, locations: [], remoteOnly: false });
    expect(bestProfileStep(items)?.key).toBe("described"); // 3 described roles = +24, beats 8 more skills = +20
    expect(items.find((i) => i.key === "places")?.done).toBe(false);
  });

  it("has nothing left for a complete profile", () => {
    const full = {
      skills: Array.from({ length: 15 }, (_, i) => `s${i}`),
      experience: Array.from({ length: 3 }, () => ({ start: "2020-01", summary: "x".repeat(80) })),
      yearsExperience: 6,
      locations: [],
      remoteOnly: true,
    };
    expect(bestProfileStep(profileChecklist(full))).toBeNull();
  });
});

describe("nextAction", () => {
  const checklist = profileChecklist({ ...demo, locations: ["Stockholm"], remoteOnly: false });
  const job = (id: string, score: number, applied = false) => ({ id, title: `Job ${id}`, company: "Acme", score, applied });

  it("sends you to a strong match you haven't applied to", () => {
    const a = nextAction({ matches: [job("a", 92, true), job("b", 86), job("c", 81), job("d", 60)], strength: 40, checklist, gaps: [] });
    expect(a).toMatchObject({ kind: "apply", jobId: "b", ready: 2 });
  });

  it("fixes a very thin profile before anything else", () => {
    const thin = profileChecklist({ skills: ["excel"], experience: [], yearsExperience: null, locations: [], remoteOnly: false });
    const a = nextAction({ matches: [job("b", 90)], strength: 3, checklist: thin, gaps: [] });
    expect(a.kind).toBe("profile");
  });

  it("suggests the most common missing skill when nothing is ready", () => {
    const done = profileChecklist({
      skills: Array.from({ length: 15 }, (_, i) => `s${i}`),
      experience: Array.from({ length: 3 }, () => ({ start: "2020-01", summary: "x".repeat(80) })),
      yearsExperience: 6, locations: ["Malmö"], remoteOnly: false,
    });
    const a = nextAction({ matches: [job("a", 70)], strength: 100, checklist: done, gaps: [{ skill: "excel", jobs: 4 }] });
    expect(a).toEqual({ kind: "learn", skill: "excel", jobs: 4 });
  });

  it("falls back to browsing", () => {
    const done = profileChecklist({
      skills: Array.from({ length: 15 }, (_, i) => `s${i}`),
      experience: Array.from({ length: 3 }, () => ({ start: "2020-01", summary: "x".repeat(80) })),
      yearsExperience: 6, locations: ["Malmö"], remoteOnly: false,
    });
    expect(nextAction({ matches: [], strength: 100, checklist: done, gaps: [] })).toEqual({ kind: "browse" });
  });
});
