import { describe, it, expect } from "vitest";
import { SUPPLY_CHAIN_PRESET, hasTerm, isEnglishJob, maxPriority, scorePriorities, PriorityRules } from "@/lib/priorities";

const job = (o: Partial<Parameters<typeof scorePriorities>[0]>) => ({ title: "", description: "", requirements: "", skills: [], remote: false, ...o });

describe("my priorities", () => {
  it("scores the supply-chain list on a Swedish ad", () => {
    const r = scorePriorities(job({
      title: "Logistiksamordnare till Volvo",
      description: "Du planerar transporter (transportplanering) och arbetar i SAP och Power BI. Goda kunskaper i Excel. Hybridarbete möjligt.",
      skills: [{ name: "procurement", required: true }],
    }), SUPPLY_CHAIN_PRESET);
    expect(r.hits.map((h) => h.label)).toEqual([
      "Logistics Coordinator", "SAP experience", "Power BI", "Excel (advanced)", "Procurement", "Transport planning", "Hybrid / remote",
    ]);
    expect(r.score).toBe(30 + 20 + 15 + 15 + 15 + 15 + 10);
  });

  it("an English ad for a supply chain coordinator", () => {
    const r = scorePriorities(job({
      title: "Supply Chain Coordinator",
      description: "We are looking for a coordinator to join our team. You will work with suppliers and the planning team, and you are fluent in English. The role is in our Gothenburg office and we offer a great team.",
    }), SUPPLY_CHAIN_PRESET);
    expect(r.hits.map((h) => h.label)).toEqual(["Supply Chain Coordinator", "English-speaking job"]);
    expect(r.score).toBe(35);
  });

  it("short terms must stand alone, long ones match inside Swedish compounds", () => {
    expect(hasTerm("vi använder sap dagligen", "sap")).toBe(true);
    expect(hasTerm("sapporo restaurang", "sap")).toBe(false);
    expect(hasTerm("vi söker en transportplanerare", "transportplanerare")).toBe(true);
    expect(hasTerm("lageradministratören ansvarar", "lageradministratör")).toBe(true);
  });

  it("a Swedish ad is not counted as English", () => {
    expect(isEnglishJob("vi söker en lagerarbetare som är noggrann och har körkort. du kommer att arbeta i ett team med fokus på kvalitet och för oss är det viktigt att du trivs")).toBe(false);
    expect(isEnglishJob("arbetsspråket är engelska")).toBe(true);
  });

  it("no rules, no score; the preset validates and adds up to 165", () => {
    expect(scorePriorities(job({ title: "x" }), [])).toEqual({ score: 0, hits: [] });
    expect(PriorityRules.parse(SUPPLY_CHAIN_PRESET)).toHaveLength(10);
    expect(maxPriority(SUPPLY_CHAIN_PRESET)).toBe(165);
  });
});
