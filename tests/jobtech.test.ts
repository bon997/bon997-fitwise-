import { describe, expect, it } from "vitest";
import { mapJobTechHit, jobTechEmployment } from "@/lib/sources/jobtech";

describe("Platsbanken mapping", () => {
  it("maps a hit to a RawJob", () => {
    const j = mapJobTechHit({
      id: "31499469",
      headline: "Logistikkoordinator",
      webpage_url: "https://arbetsformedlingen.se/platsbanken/annonser/31499469",
      description: { text: "Vi söker en logistikkoordinator. Arbete på distans 2 dagar/vecka." },
      employer: { name: "A Hub AB" },
      workplace_address: { municipality: "Stockholm", region: "Stockholms län" },
      working_hours_type: { label: "Heltid" },
      employment_type: { label: "Vanlig anställning" },
      must_have: { skills: [{ label: "SAP" }] },
      nice_to_have: { skills: [{ label: "Excel" }] },
      publication_date: "2026-09-21T10:22:50",
    });
    expect(j).toMatchObject({
      source: "jobtech",
      externalId: "31499469",
      company: "A Hub AB",
      location: "Stockholm, Stockholms län",
      employmentType: "full_time",
      remote: true,
      applyUrl: "https://arbetsformedlingen.se/platsbanken/annonser/31499469",
    });
    expect(j.requirements).toContain("Required: SAP");
    expect(j.postedAt?.getFullYear()).toBe(2026);
  });

  it("reads Swedish employment labels", () => {
    expect(jobTechEmployment("Deltid", "Vanlig anställning")).toBe("part_time");
    expect(jobTechEmployment("Heltid", "Sommarjobb / feriejobb")).toBe("contract");
    expect(jobTechEmployment(null, null)).toBeNull();
  });
});
