import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RawGapReport, tidy, generateGapReport } from "@/lib/agents/gap-report";
import { isStale } from "@/lib/ai-reports";

let next: unknown = null;
function fakeClaude() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({
      id: "m", type: "message", role: "assistant", model: "x", stop_reason: "tool_use", stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
      content: [{ type: "tool_use", id: "t", name: "save_gap_report", input: next }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

describe("gap report", () => {
  beforeAll(fakeClaude);
  afterAll(() => vi.unstubAllGlobals());

  it("tolerates odd model output and keeps the layout's limits", () => {
    const r = tidy(RawGapReport.parse({
      summary: "Strong logistics base. Add SAP MM.",
      industry_match: { score: "140", note: "Same industry." },
      strengths: [{ title: "Transport planning", evidence: "4 years at DHL" }, { title: "", evidence: "x" }],
      missing: [
        { skill: "Power BI", importance: "optional", how_to_close: "Microsoft PL-300 course" },
        { skill: "SAP MM", importance: "must", how_to_close: "Show your MM transactions" },
      ],
      improvements: Array.from({ length: 9 }, (_, i) => `Edit ${i}`),
      certifications: "none",
      ats_keywords: ["SAP MM", "SAP MM", "inköpsorder"],
    }));
    expect(r.industry_match.score).toBe(100);
    expect(r.strengths).toHaveLength(1);
    expect(r.missing.map((m) => m.skill)).toEqual(["SAP MM", "Power BI"]); // must-haves first
    expect(r.missing[1].importance).toBe("nice");
    expect(r.improvements).toHaveLength(5);
    expect(r.certifications).toEqual([]);
    expect(r.ats_keywords).toEqual(["SAP MM", "inköpsorder"]);
    expect(r.ats_tips).toEqual([]);
  });

  it("asks Claude with the job and CV and returns a tidy report", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    next = { summary: "Good fit.", industry_match: { score: 80, note: "" }, strengths: [], missing: [], improvements: [], certifications: [], ats_keywords: [], ats_tips: [] };
    const r = await generateGapReport({
      profileText: "Logistics coordinator, 4 years",
      years: 4, seniority: "mid", education: "bachelor in logistics",
      job: { title: "Material Planner", company: "Volvo", description: "Plan materials", requirements: "SAP MM", skills: ["sap mm"] },
      fit: { score: 72, matched: ["logistics"], missing: ["sap mm"], partial: [] },
      locale: "sv",
    });
    expect(r.summary).toBe("Good fit.");
    const sent = JSON.parse(String((fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls.at(-1)![1].body));
    expect(sent.messages[0].content).toContain("Material Planner at Volvo");
    expect(sent.messages[0].content).toContain("svenska");
  });

  it("marks a report stale once the profile changed after it", () => {
    expect(isStale({ created_at: "2026-11-10" }, "2026-11-12")).toBe(true);
    expect(isStale({ created_at: "2026-11-12" }, "2026-11-10")).toBe(false);
    expect(isStale({ created_at: "2026-11-12" }, null)).toBe(false);
  });
});
