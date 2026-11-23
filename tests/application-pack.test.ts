import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RawApplicationPack, tidyPack, generateApplicationPack } from "@/lib/ai/application-pack";
import { letterHasKeyword } from "@/lib/application-pack-shared";

let next: unknown = null;
beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    id: "m", type: "message", role: "assistant", model: "x", stop_reason: "tool_use", stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
    content: [{ type: "tool_use", id: "t", name: "save_application_pack", input: next }],
  }), { status: 200, headers: { "content-type": "application/json" } })));
});
afterAll(() => vi.unstubAllGlobals());

describe("cover letter pack", () => {
  it("checks ATS keywords against the letter as whole phrases, ignoring case and accents", () => {
    const letter = "I planned materials in SAP MM and cut stock-outs by 30 %. Jag har arbetat med inköp och S&OP.";
    expect(letterHasKeyword(letter, "sap mm")).toBe(true);
    expect(letterHasKeyword(letter, "Inköp")).toBe(true);
    expect(letterHasKeyword(letter, "S&OP")).toBe(true);
    expect(letterHasKeyword(letter, "SAP EWM")).toBe(false);
    expect(letterHasKeyword(letter, "MM")).toBe(true);
    expect(letterHasKeyword(letter, "plan")).toBe(false); // not inside "planned"
    expect(letterHasKeyword("Vi planerade om säkerhetslagret.", "säkerhetslager")).toBe(true); // Swedish ending
    expect(letterHasKeyword("leverantörerna", "leverantör")).toBe(true);
    expect(letterHasKeyword("enligt reglerna", "regel")).toBe(true);
    expect(letterHasKeyword("ledtider", "ledtid")).toBe(true);
    expect(letterHasKeyword("materialplanerare", "materialplanering")).toBe(false);
  });

  it("cleans the model output: 5 requirements, unique keywords, odd values tolerated", () => {
    const p = tidyPack(RawApplicationPack.parse({
      letter: "Hej,\n\n\n\nJag vill …\r\n\nMed vänlig hälsning\nAbdi",
      requirements: Array.from({ length: 7 }, (_, i) => ({ requirement: `Req ${i}`, match: i === 1 ? "unknown" : "strong" })),
      keywords: ["SAP MM", "SAP MM", " MRP ", ""],
      email_subject: "Ansökan: Materialplanerare",
      email_body: "Hej! Jag söker tjänsten. Mitt CV är bifogat. Jag ser fram emot att höras.",
    }));
    expect(p.letter).toBe("Hej,\n\nJag vill …\n\nMed vänlig hälsning\nAbdi");
    expect(p.requirements).toHaveLength(5);
    expect(p.requirements[1].match).toBe("partial");
    expect(p.keywords).toEqual(["SAP MM", "MRP"]);
    expect(p.email.subject).toBe("Ansökan: Materialplanerare");
  });

  it("sends the company text, achievements and languages to the larger model", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    next = { letter: "Dear team, …", requirements: [], keywords: ["SAP MM"], email_subject: "Ansökan", email_body: "Hej." };
    const p = await generateApplicationPack({
      candidateName: "Abdi", profileText: "Logistics coordinator, 4 years",
      job: { title: "Material Planner", company: "Nordlast", description: "Plan materials", requirements: "SAP MM" },
      fit: { matchedSkills: ["logistics"], missingSkills: ["sap mm"] },
      language: "en", noteLanguage: "sv",
      achievements: "Cut stock-outs by 30%", companyText: "We build sustainable trucks.",
    });
    expect(p.letter).toBe("Dear team, …");
    const sent = JSON.parse(String((fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls.at(-1)![1].body));
    const content = String(sent.messages[0].content);
    expect(sent.model).toContain("sonnet");
    expect(content).toContain("<company_mission_values>");
    expect(content).toContain("<candidate_key_achievements>");
    expect(content).toContain("Write the cover letter in English.");
    expect(content).toContain("Skriv analysens anteckningar på svenska.");
    expect(content).toContain("always in Swedish");
  });
});
