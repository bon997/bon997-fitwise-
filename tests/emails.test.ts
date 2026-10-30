import { describe, expect, it } from "vitest";
import { emailLayout, esc } from "@/lib/email";
import { resetEmail } from "@/lib/password-reset";
import { verifyEmail } from "@/lib/email-verify";
import { alertEmail, oneClickUrl, unsubscribeUrl, type AlertJob } from "@/lib/job-alerts";

const job = (over: Partial<AlertJob["job"]> = {}, score = 82): AlertJob => ({
  job: { id: "11111111-1111-1111-1111-111111111111", title: "Lagerarbetare", company: "Åhléns", location: "Malmö", remote: false, salary_range: "28–32k SEK / mo", ...over },
  fit: { score, matched_skills: ["truck", "wms"], missing_skills: ["sap"] },
});

describe("email basics", () => {
  it("escapes HTML", () => {
    expect(esc(`<script>"x" & 'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;");
    expect(esc(null)).toBe("");
  });

  it("hides the preheader and escapes it", () => {
    expect(emailLayout({ preheader: "<b>", body: "", footer: "" })).toContain("&lt;b&gt;</span>");
  });
});

describe("password reset email", () => {
  it("is in the reader's language and carries the link in both parts", () => {
    const link = "https://fitwise.se/reset-password?token=abc";
    const sv = resetEmail({ name: "Anna Svensson", link, locale: "sv" });
    expect(sv.subject).toBe("Återställ ditt lösenord på Fitwise");
    expect(sv.text).toContain("Hej Anna,");
    expect(sv.text).toContain(link);
    expect(sv.html).toContain(`href="${link}"`);
    expect(resetEmail({ name: null, link, locale: "en" }).text.startsWith("Hi,")).toBe(true);
  });

  it("escapes a hostile name", () => {
    expect(resetEmail({ name: "<img src=x>", link: "https://x", locale: "en" }).html).not.toContain("<img src=x>");
  });
});

describe("confirm email", () => {
  it("links to the confirmation page", () => {
    const e = verifyEmail({ name: "Ali", link: "https://fitwise.se/verify-email?token=t", locale: "en" });
    expect(e.subject).toBe("Confirm your email for Fitwise");
    expect(e.html).toContain('href="https://fitwise.se/verify-email?token=t"');
  });
});

describe("job alert email", () => {
  const base = "https://fitwise.se";
  const token = "a".repeat(36);

  it("counts jobs in the subject, in both languages", () => {
    expect(alertEmail({ name: "Anna", jobs: [job()], locale: "sv", base, alertsToken: token }).subject).toBe("1 nytt jobb som passar dig");
    expect(alertEmail({ name: "Anna", jobs: [job(), job()], locale: "en", base, alertsToken: token }).subject).toBe("2 new jobs that fit you");
  });

  it("lists each job with score, skills and a link", () => {
    const e = alertEmail({ name: "Anna", jobs: [job()], locale: "en", base, alertsToken: token });
    expect(e.html).toContain(`href="${base}/jobs/11111111-1111-1111-1111-111111111111"`);
    expect(e.html).toContain(">82<");
    expect(e.html).toContain("You have: Truck, WMS");
    expect(e.html).toContain("Missing: SAP");
    expect(e.text).toContain("Lagerarbetare (82 fit)");
    expect(e.text).toContain("Åhléns · Malmö · 28–32k SEK / mo");
  });

  it("offers one-click unsubscribe in the body and the headers", () => {
    const e = alertEmail({ name: null, jobs: [job()], locale: "en", base, alertsToken: token });
    expect(e.html).toContain(`href="${unsubscribeUrl(base, token)}"`);
    expect(e.headers["List-Unsubscribe"]).toBe(`<${oneClickUrl(base, token)}>`);
    expect(e.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("escapes text that comes from job ads", () => {
    const e = alertEmail({ name: null, jobs: [job({ title: '<a href="evil">Win</a>', company: "A & B" })], locale: "en", base, alertsToken: token });
    expect(e.html).not.toContain('<a href="evil">');
    expect(e.html).toContain("A &amp; B");
  });

  it("marks remote jobs without repeating the word", () => {
    expect(alertEmail({ name: null, jobs: [job({ location: "Stockholm", remote: true })], locale: "sv", base, alertsToken: token }).text).toContain("Stockholm · Distans");
    expect(alertEmail({ name: null, jobs: [job({ location: "Remote (EU)", remote: true })], locale: "en", base, alertsToken: token }).text).not.toContain("Remote (EU) · Remote");
  });
});
