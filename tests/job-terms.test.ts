import { describe, it, expect } from "vitest";
import { PLACES, editDistance, suggestSpelling } from "@/lib/job-terms";
import { summary } from "@/lib/scheduled-import";

describe("search spelling hints", () => {
  it("catches common typos", () => {
    expect(suggestSpelling("lagistics")).toBe("logistics");
    expect(suggestSpelling("logistcs")).toBe("logistics");
    expect(suggestSpelling("inköapre")).toBe("inköpare");
    expect(suggestSpelling("warehuose")).toBe("warehouse");
    expect(suggestSpelling("supply chian")).toBe("supply chain");
    expect(suggestSpelling("Göteborgg", PLACES)).toBe("göteborg");
    expect(suggestSpelling("stokholm", PLACES)).toBe("stockholm");
  });

  it("leaves correct, short and unknown words alone", () => {
    for (const ok of ["logistics", "Inköpare", "supply chain", "lager", "it", "SAP", "kubernetes", "barista"]) {
      expect(suggestSpelling(ok)).toBeNull();
    }
    expect(suggestSpelling("Malmö", PLACES)).toBeNull();
  });

  it("counts a swap of two letters as one edit", () => {
    expect(editDistance("chian", "chain")).toBe(1);
    expect(editDistance("lagistics", "logistics")).toBe(1);
  });

  it("tells the admin to check the spelling when a search finds nothing", () => {
    expect(summary({ fetched: 0, inserted: 0, duplicates: 0 })).toContain("check the spelling");
    expect(summary({ fetched: 10, inserted: 9, duplicates: 0 })).toBe("10 found · 9 new");
  });
});
