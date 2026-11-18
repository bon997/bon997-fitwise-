import { describe, expect, it } from "vitest";
import { normalizeSkill, skillCredit } from "@/lib/ai/skills";
import { skillLabel } from "@/lib/format";

describe("supply-chain skills", () => {
  it("keeps SAP modules apart and spells them out", () => {
    expect(normalizeSkill("SAP S/4HANA")).toBe("sap s/4hana");
    expect(normalizeSkill("S4HANA")).toBe("sap s/4hana");
    expect(normalizeSkill("SAP Materials Management")).toBe("sap mm");
    expect(normalizeSkill("SAP ECC")).toBe("sap");
    expect(skillLabel("sap mm")).toBe("SAP MM");
    expect(skillLabel("sap s/4hana")).toBe("SAP S/4HANA");
  });

  it("maps Swedish planning terms", () => {
    expect(normalizeSkill("Materialplanering")).toBe("material planning");
    expect(normalizeSkill("Material Requirements Planning")).toBe("mrp");
    expect(normalizeSkill("Lagerstyrning")).toBe("inventory management");
    expect(normalizeSkill("Avancerad Excel")).toBe("microsoft excel");
  });

  it("credits related skills", () => {
    expect(skillCredit("sap", new Set(["sap mm"]))).toBe(1);
    expect(skillCredit("sap mm", new Set(["sap"]))).toBe(0.5);
    expect(skillCredit("sap ewm", new Set(["sap wm"]))).toBe(0.5);
    expect(skillCredit("mrp", new Set(["material planning"]))).toBe(0.5);
    expect(skillCredit("demand planning", new Set(["microsoft excel"]))).toBe(0);
  });
});
