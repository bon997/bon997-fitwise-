import { describe, it, expect } from "vitest";
import { tagSkills } from "@/lib/ingest";
import { mapJobTechHit } from "@/lib/sources/jobtech";

describe("Platsbanken tag fallback", () => {
  it("turns the employer's must-have / nice-to-have tags into skills", () => {
    const raw = mapJobTechHit({
      id: "1", headline: "Inköpare", employer: { name: "Acme" },
      must_have: { skills: [{ label: "Inköp" }, { label: "SAP" }] },
      nice_to_have: { skills: [{ label: "Engelska" }, { label: "SAP" }] },
    } as never);
    const skills = tagSkills({ source: "jobtech", requirements: raw.requirements });
    expect(skills.every((s) => s.src === "tags")).toBe(true);
    const sap = skills.find((s) => s.name === "sap");
    expect(sap?.required).toBe(true); // listed as both: must-have wins
    expect(skills).toHaveLength(3);
    expect(skills.filter((s) => s.required)).toHaveLength(2);
  });

  it("gives nothing for other sources or ads without tags", () => {
    expect(tagSkills({ source: "serpapi", requirements: "Required: SQL" })).toEqual([]);
    expect(tagSkills({ source: "jobtech", requirements: "" })).toEqual([]);
  });
});
