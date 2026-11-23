import { describe, expect, it } from "vitest";
import { normalizeSkill, languagesFromResume, withLanguages, isLanguage } from "@/lib/ai/skills";

describe("languages", () => {
  it("normalises the ways job ads write languages", () => {
    expect(["Engelska", "English (fluent)", "Flytande engelska", "God svenska i tal och skrift", "Svenska – modersmål", "Business English"].map(normalizeSkill))
      .toEqual(["english", "english", "english", "swedish", "swedish", "english"]);
    expect(normalizeSkill("English teacher")).toBe("english teacher"); // a role, not a language
    expect(isLanguage("english")).toBe(true);
    expect(isLanguage("sap mm")).toBe(false);
  });

  it("reads languages from the CV: named ones and the language it is written in", () => {
    expect(languagesFromResume("Språk: Svenska (modersmål), Engelska (flytande), Arabiska")).toEqual(["english", "swedish", "arabic"]);
    const englishCv = "I worked as a logistics coordinator and was responsible for the planning of transports to and from the warehouse. "
      + "I managed suppliers and carriers, and I have experience with SAP and Excel in the role. The work was done in a team of six with the site manager.";
    expect(languagesFromResume(englishCv)).toEqual(["english"]);
    expect(languagesFromResume("")).toEqual([]);
    expect(withLanguages(["sap mm", "english"], englishCv)).toEqual(["sap mm", "english"]);
  });
});
