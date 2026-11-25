import { describe, it, expect } from "vitest";
import { linkify, costAnswer, QUICK } from "@/lib/help-shared";
import { helpKnowledge } from "@/lib/help-kb";

describe("help chat links", () => {
  it("turns known site paths into links and leaves the rest as text", () => {
    const p = linkify("Upload your CV on /profile, then open /jobs.");
    expect(p).toEqual([
      { text: "Upload your CV on " },
      { href: "/profile", text: "/profile" },
      { text: ", then open " },
      { href: "/jobs", text: "/jobs" },
      { text: "." },
    ]);
  });
  it("links sub-pages and full jobfitwise.se URLs, but not unknown paths or other sites", () => {
    expect(linkify("see /jobs/123/interview")).toContainEqual({ href: "/jobs/123/interview", text: "/jobs/123/interview" });
    expect(linkify("go to https://www.jobfitwise.se/pricing.")).toContainEqual({ href: "/pricing", text: "https://www.jobfitwise.se/pricing" });
    expect(linkify("PDF/Word and /etc/passwd and https://evil.example/profile").every((x) => !("href" in x))).toBe(true);
  });
  it("makes our email address a mailto link, but not other addresses", () => {
    expect(linkify("Email hej@jobfitwise.se.")).toEqual([{ text: "Email " }, { href: "mailto:hej@jobfitwise.se", text: "hej@jobfitwise.se" }, { text: "." }]);
    expect(linkify("or someone@gmail.com").every((x) => !("href" in x))).toBe(true);
  });
  it("keeps the whole text", () => {
    const s = "Steps:\n1. /signup\n2. /profile → Job alerts";
    expect(linkify(s).map((x) => x.text).join("")).toBe(s);
  });
});

describe("help chat answers", () => {
  it("has the same quick questions in both languages, one left for the live price answer", () => {
    expect(QUICK.sv.length).toBe(QUICK.en.length);
    expect(QUICK.en.filter((q) => !q.a)).toHaveLength(1);
  });
  it("tells the truth about prices whether or not the paywall is on", () => {
    expect(costAnswer("en", { paywall: false, pro: 79, premium: 149, trialDays: 7 })).toMatch(/free during the beta/);
    const live = costAnswer("sv", { paywall: true, pro: 79, premium: 149, trialDays: 7 });
    expect(live).toContain("79 kr");
    expect(live).toContain("7 dagar");
  });
  it("gives the AI a guide that covers the main pages", () => {
    const kb = helpKnowledge();
    for (const path of ["/profile", "/jobs", "/applications", "/career", "/pricing", "/faq"]) expect(kb).toContain(path);
  });
});
