import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RawCareerPlan, tidyPlan, previewPlan, generateCareerPlan } from "@/lib/agents/career";
import { titleVariants } from "@/lib/career";

let next: unknown = null;
function fakeClaude() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({
      id: "m", type: "message", role: "assistant", model: "x", stop_reason: "tool_use", stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
      content: [{ type: "tool_use", id: "t", name: "save_career_plan", input: next }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

describe("career coach", () => {
  beforeAll(fakeClaude);
  afterAll(() => vi.unstubAllGlobals());

  it("cleans the plan: limits, empty items dropped, skills ordered by priority", () => {
    const p = tidyPlan(RawCareerPlan.parse({
      current_role: "Logistics Coordinator",
      path: [
        { role: "Material Planner", when: "0–1 year", salary: "36 000–42 000 kr", skills: ["SAP MM", "MRP", "Excel", "S&OP", "extra"] },
        { role: "" },
        { role: "Supply Planner" }, { role: "Senior Supply Planner" }, { role: "Supply Chain Manager" }, { role: "Director" },
      ],
      skill_plan: [
        { skill: "Power BI", priority: "later" },
        { skill: "SAP MM", priority: "now" },
        { skill: "S&OP", priority: "soon" },
      ],
      certifications: "none",
    }));
    expect(p.path.map((s) => s.role)).toEqual(["Material Planner", "Supply Planner", "Senior Supply Planner", "Supply Chain Manager"]);
    expect(p.path[0].skills).toHaveLength(4);
    expect(p.skill_plan.map((s) => s.skill)).toEqual(["SAP MM", "S&OP", "Power BI"]); // now, next (unknown → next), later
    expect(p.certifications).toEqual([]);
  });

  it("preview keeps the path and first steps only", () => {
    const p = previewPlan(tidyPlan(RawCareerPlan.parse({
      path: [{ role: "Material Planner" }], first_steps: ["Ask for SAP MM access"], skill_plan: [{ skill: "MRP" }],
      certifications: [{ name: "CPIM" }], alternatives: [{ role: "Inköpare" }], salary_tips: ["Negotiate yearly"],
    })));
    expect(p.path).toHaveLength(1);
    expect(p.first_steps).toEqual(["Ask for SAP MM access"]);
    expect([p.skill_plan, p.certifications, p.alternatives, p.salary_tips]).toEqual([[], [], [], []]);
    expect(p.locked).toBe(true);
  });

  it("splits bilingual role titles for the open-job search", () => {
    expect(titleVariants("Material Planner / Materialplanerare")).toEqual(["Material Planner", "Materialplanerare"]);
    expect(titleVariants("Inköpare (Buyer)")).toEqual(["Inköpare", "Buyer"]);
    expect(titleVariants("Supply Planner or Demand Planner")).toEqual(["Supply Planner", "Demand Planner"]);
  });

  it("asks the larger model with the user's target and time frame", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    next = { current_role: "Lagerarbetare", summary: "s", path: [{ role: "Logistikkoordinator" }] };
    const p = await generateCareerPlan({
      profileText: "Warehouse operator, forklift, WMS", years: 3, seniority: "junior", education: "", targetRole: "Supply Planner", horizon: 5, locale: "sv",
    });
    expect(p.path[0].role).toBe("Logistikkoordinator");
    const sent = JSON.parse(String((fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls.at(-1)![1].body));
    expect(sent.model).toContain("sonnet");
    expect(sent.messages[0].content).toContain("wants to reach: Supply Planner");
    expect(sent.messages[0].content).toContain("within 5 years");
  });
});
