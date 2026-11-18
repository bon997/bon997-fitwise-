import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  RawInterviewPack, tidyPack, previewPack, pickMockQuestions, tidyTurn, RawInterviewTurn, readiness, evaluateAnswer,
} from "@/lib/agents/interview";

let next: unknown = null;
function fakeClaude() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({
      id: "m", type: "message", role: "assistant", model: "x", stop_reason: "tool_use", stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
      content: [{ type: "tool_use", id: "t", name: "save_feedback", input: next }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

const q = (category: string, i: number) => ({ category, question: `Q${i} ${category}`, why: "w", answer: "a", tip: "t" });

describe("interview coach", () => {
  beforeAll(fakeClaude);
  afterAll(() => vi.unstubAllGlobals());

  it("cleans the pack and tolerates unknown categories", () => {
    const pack = tidyPack(RawInterviewPack.parse({
      focus: "Planning and SAP.",
      questions: [q("motivation", 1), q("weird", 2), { question: "" }, ...Array.from({ length: 25 }, (_, i) => q("technical", i + 3))],
      star: [{ title: "Cut lead times", situation: "s", task: "t", action: "a", result: "r" }, { title: "No action", situation: "s" }],
      ask_them: "none",
    }));
    expect(pack.questions).toHaveLength(20);
    expect(pack.questions[1].category).toBe("experience");
    expect(pack.star).toHaveLength(1);
    expect(pack.ask_them).toEqual([]);
  });

  it("preview shows only the first questions and hides the rest", () => {
    const pack = tidyPack(RawInterviewPack.parse({ focus: "f", questions: Array.from({ length: 16 }, (_, i) => q("experience", i)), star: [{ title: "x", action: "a" }], ask_them: ["?"], salary_tip: "s" }));
    const p = previewPack(pack, 3);
    expect(p.questions).toHaveLength(3);
    expect(p.locked_questions).toBe(13);
    expect(p.star).toEqual([]);
    expect(p.salary_tip).toBe("");
  });

  it("picks a realistic mix of five mock questions", () => {
    const pack = tidyPack(RawInterviewPack.parse({
      questions: [q("technical", 1), q("experience", 2), q("motivation", 3), q("experience", 4), q("situational", 5), q("culture", 6)],
    }));
    expect(pickMockQuestions(pack)!.map((x) => x.category)).toEqual(["motivation", "experience", "technical", "experience", "situational"]);
    expect(pickMockQuestions(tidyPack(RawInterviewPack.parse({ questions: [q("technical", 1)] })))).toBeNull();
  });

  it("never rewards an empty answer and clamps scores", () => {
    expect(tidyTurn(RawInterviewTurn.parse({ score: 5, feedback: "f", stronger: "s" }), "ok").score).toBe(1);
    expect(tidyTurn(RawInterviewTurn.parse({ score: "9" }), "I planned materials for three production lines at Volvo.").score).toBe(5);
    expect(tidyTurn(RawInterviewTurn.parse({ score: "bad" }), "I planned materials for three production lines at Volvo.").score).toBe(3);
  });

  it("turns 1-5 scores into a 0-100 readiness", () => {
    expect(readiness([5, 5, 5, 5, 5])).toBe(100);
    expect(readiness([1, 1, 1, 1, 1])).toBe(0);
    expect(readiness([4, 3, 4, 5, 3])).toBe(70);
    expect(readiness([])).toBe(0);
  });

  it("scores an answer through Claude with the question and answer as data", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    next = { score: 4, feedback: "Clear example.", stronger: "At Volvo I…" };
    const r = await evaluateAnswer({
      candidate: { profileText: "Material planner", years: 3, seniority: "mid" },
      job: { title: "Supply Planner", company: "Scania", description: "", requirements: "", skills: [] },
      question: "Tell me about a shortage you solved.",
      answer: "We had a shortage of brackets and I re-planned the orders with two suppliers.",
      locale: "en",
    });
    expect(r).toEqual({ score: 4, feedback: "Clear example.", stronger: "At Volvo I…" });
    const sent = JSON.parse(String((fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls.at(-1)![1].body));
    expect(sent.messages[0].content).toContain("<candidate_answer>");
  });
});
