import { describe, it, expect } from "vitest";
import { buildProfile, personalize, titleTokens, forYouScore, MAX_BOOST, type PersonalJob, type UserSignals } from "@/lib/ai/personalize";

const job = (over: Partial<PersonalJob> = {}): PersonalJob => ({
  title: "Senior Frontend Engineer",
  company: "Northwind",
  location: "Stockholm, Sweden",
  seniority: "senior",
  skills: [{ name: "React", required: true }, { name: "TypeScript", required: true }],
  salary_min: null,
  salary_max: null,
  ...over,
});

const empty: UserSignals = { targetTitles: [], salaryMin: null, liked: [], dismissed: [] };

describe("personalize", () => {
  it("does nothing for a brand-new user", () => {
    expect(personalize(job(), buildProfile(empty))).toEqual({ boost: 0, reasons: [], hidden: false });
  });

  it("title tokens ignore seniority words", () => {
    expect([...titleTokens("Senior Front-end Engineer II")]).toEqual(["frontend", "engineer"]);
    expect([...titleTokens("Frontend Developer")]).toEqual(["frontend", "engineer"]);
  });

  it("boosts jobs matching a target role, but not on a shared generic word", () => {
    const prof = buildProfile({ ...empty, targetTitles: ["Frontend Engineer"] });
    const p = personalize(job(), prof);
    expect(p.boost).toBe(6);
    expect(p.reasons).toEqual([{ text: "Matches a role you're targeting", positive: true }]);
    expect(personalize(job({ title: "Frontend Developer" }), prof).boost).toBe(6);
    expect(personalize(job({ title: "Data Engineer" }), prof).boost).toBe(0);
  });

  it("learns from saved and applied jobs", () => {
    const liked = [{ job: job({ title: "Frontend Developer", company: "Other" }), weight: 3 }];
    const p = personalize(job({ title: "Lead Frontend Developer" }), buildProfile({ ...empty, liked }));
    expect(p.boost).toBeGreaterThan(0);
    expect(p.reasons).toContainEqual({ text: "Similar to jobs you saved or applied to", positive: true });
    const unrelated = personalize(job({ title: "Payroll Specialist", skills: [{ name: "Excel", required: true }] }), buildProfile({ ...empty, liked }));
    expect(unrelated.boost).toBe(0);
  });

  it("doesn't call a saved job similar to itself", () => {
    const saved = job({ id: "j1", title: "Frontend Developer" });
    expect(personalize(saved, buildProfile({ ...empty, liked: [{ job: saved, weight: 2 }] })).reasons).toEqual([]);
  });

  it("penalizes pay below the minimum and rewards pay above it", () => {
    const prof = buildProfile({ ...empty, salaryMin: 600_000 });
    expect(personalize(job({ salary_min: 400_000, salary_max: 500_000 }), prof).boost).toBe(-10);
    expect(personalize(job({ salary_min: 650_000, salary_max: 700_000 }), prof).boost).toBe(3);
    expect(personalize(job(), prof).boost).toBe(0); // unknown salary: neutral
  });

  it("hides companies the user hid", () => {
    const prof = buildProfile({ ...empty, dismissed: [{ job: job(), reason: "company" }] });
    expect(personalize(job({ title: "Designer" }), prof).hidden).toBe(true);
    expect(personalize(job({ company: "Halcyon" }), prof).hidden).toBe(false);
  });

  it("needs two location or seniority dismissals before penalizing (one could be a one-off)", () => {
    const one = buildProfile({ ...empty, dismissed: [{ job: job(), reason: "wrong_location" }] });
    expect(personalize(job({ title: "Data Analyst" }), one).boost).toBe(0);
    const two = buildProfile({ ...empty, dismissed: [{ job: job(), reason: "wrong_location" }, { job: job({ title: "QA" }), reason: "wrong_location" }] });
    const p = personalize(job({ title: "Data Analyst" }), two);
    expect(p.boost).toBe(-6);
    expect(p.reasons[0]).toMatchObject({ text: expect.stringMatching(/Stockholm/), positive: false });
  });

  it("penalizes roles marked 'not my role'", () => {
    const prof = buildProfile({ ...empty, dismissed: [{ job: job({ title: "Sales Engineer" }), reason: "not_my_role" }] });
    expect(personalize(job({ title: "Senior Sales Engineer" }), prof).boost).toBeLessThan(0);
  });

  it("labels each reason with its own direction", () => {
    const liked = [{ job: job({ title: "Frontend Developer" }), weight: 3 }];
    const p = personalize(job({ title: "Junior Frontend Developer", salary_max: 400_000 }), buildProfile({ ...empty, salaryMin: 600_000, liked }));
    expect(p.reasons).toEqual([
      { text: "Similar to jobs you saved or applied to", positive: true },
      { text: "Pays below your minimum salary", positive: false },
    ]);
  });

  it("is bounded", () => {
    const prof = buildProfile({
      targetTitles: [],
      salaryMin: 900_000,
      liked: [],
      dismissed: [
        { job: job({ title: "Frontend Engineer", company: "A" }), reason: "not_my_role" },
        { job: job({ company: "B" }), reason: "wrong_location" },
        { job: job({ company: "C" }), reason: "wrong_location" },
        { job: job({ company: "D" }), reason: "wrong_seniority" },
        { job: job({ company: "E" }), reason: "wrong_seniority" },
      ],
    });
    const p = personalize(job({ salary_max: 100_000 }), prof);
    expect(p.boost).toBe(-MAX_BOOST);
    expect(forYouScore(10, p.boost)).toBe(0);
    expect(forYouScore(95, MAX_BOOST)).toBe(100);
  });
});
