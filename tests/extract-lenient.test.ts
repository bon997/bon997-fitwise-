import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// One fake Claude for the file: the SDK client is created once and keeps the fetch it first saw.
let next: unknown = null;
const replyWith = (input: unknown) => { next = input; };
function fakeClaude() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({
      id: "m", type: "message", role: "assistant", model: "x", stop_reason: "tool_use", stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
      content: [{ type: "tool_use", id: "t", name: "save_job_signals", input: next }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

describe("job extraction tolerates unexpected values from the model", () => {
  beforeAll(fakeClaude);
  afterAll(() => vi.unstubAllGlobals());

  it("keeps the skills when the level is a word outside the list (the 'Skills not read' bug)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    replyWith({
      skills: [{ name: "Inköp", required: true }, { name: "SAP", required: "yes" }],
      responsibilities: ["Förhandla avtal"],
      seniority: "medior",
      min_years: "3",
      remote: false,
      education: { level: "kandidat", field: null, equivalent_ok: true },
    });
    const { extractJobSignals } = await import("@/lib/ai/extract-job");
    const x = await extractJobSignals({ title: "Inköpare", company: "Acme", description: "…" });
    expect(x.seniority).toBeNull();
    expect(x.min_years).toBeNull();
    expect(x.education.level).toBeNull();
    expect(x.education.equivalent_ok).toBe(true);
    expect(x.skills.map((s) => s.name).sort()).toEqual(["procurement", "sap"]);
  });

  it("still passes through valid values unchanged", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    replyWith({
      skills: [{ name: "React", required: true }], responsibilities: [], seniority: "senior", min_years: 5, remote: true,
      education: { level: "bachelor", field: "computer science", equivalent_ok: false },
    });
    const { extractJobSignals } = await import("@/lib/ai/extract-job");
    const x = await extractJobSignals({ title: "Dev", company: "Acme", description: "…" });
    expect(x).toMatchObject({ seniority: "senior", min_years: 5, remote: true, education: { level: "bachelor" } });
  });
});
