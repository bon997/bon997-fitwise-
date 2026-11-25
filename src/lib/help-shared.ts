import { defineT } from "@/i18n/config";

/** Browser-safe pieces of the help chat: quick questions answered instantly (no AI) and link parsing. */
export type QuickAnswer = { q: string; a: string };

export const QUICK = defineT<QuickAnswer[]>({
  en: [
    { q: "How do I get started?", a: "1. Create a free account at /signup (email or Google).\n2. Upload your CV on /profile: PDF, Word or text, up to 4 MB.\n3. Open /jobs: every job gets a match score from 0 to 100, best matches first." },
    { q: "How does the match score work?", a: "Each job is scored 0-100 against your CV: skills 40%, experience 30%, education 20% and location 10%. Open a job to see which skills you match, which are missing and the one skill that would raise your score most." },
    { q: "How do I write a cover letter?", a: "Open a job on /jobs and press \"Cover letter with AI\". Add a few achievements with results and, if you like, the company's mission. You get a tailored letter, a recruiter analysis, an ATS keyword check and a short Swedish email. Edit it, then send it yourself on the employer's site." },
    { q: "How do I track my applications?", a: "Everything you save or apply to is on /applications. Move each job between Saved, Applied, Interviewing, Offer and Rejected, add interview dates and notes, and see your interview and offer rates. The report for Arbetsförmedlingen is on /activity-report." },
    { q: "How do I get job alerts by email?", a: "Go to /profile → Job alerts. Choose daily, weekly or monthly, how many jobs, city and minimum match, or just write e.g. \"5 logistics jobs in Gothenburg every day\" and press Fill in, then Save." },
    { q: "What does it cost?", a: "" },
    { q: "My CV upload fails", a: "Check the file is PDF, Word (.docx) or text and under 4 MB. On a phone, save the file to the phone first (not only in Google Drive, WhatsApp or iCloud), use Wi-Fi and try again on /profile. A scanned photo of a CV can't be read; export it as a PDF from Word instead." },
  ],
  sv: [
    { q: "Hur kommer jag igång?", a: "1. Skapa ett gratiskonto på /signup (e-post eller Google).\n2. Ladda upp ditt CV på /profile: PDF, Word eller text, högst 4 MB.\n3. Öppna /jobs: varje jobb får en matchningspoäng 0–100, bästa matchningarna först." },
    { q: "Hur fungerar matchningspoängen?", a: "Varje jobb får 0–100 mot ditt CV: kompetenser 40 %, erfarenhet 30 %, utbildning 20 % och ort 10 %. Öppna ett jobb för att se vilka kompetenser du matchar, vilka som saknas och vilken kompetens som skulle höja poängen mest." },
    { q: "Hur skriver jag ett personligt brev?", a: "Öppna ett jobb på /jobs och tryck på \"Personligt brev med AI\". Lägg till några resultat du är stolt över och gärna företagets mission. Du får ett anpassat brev, en rekryteraranalys, en ATS-nyckelordskontroll och ett kort mejl på svenska. Redigera och skicka själv på arbetsgivarens webbplats." },
    { q: "Hur följer jag mina ansökningar?", a: "Allt du sparar eller söker finns på /applications. Flytta jobben mellan Sparad, Sökt, Intervju, Erbjudande och Avslag, lägg till intervjudatum och anteckningar och se din intervju- och erbjudandegrad. Rapporten till Arbetsförmedlingen finns på /activity-report." },
    { q: "Hur får jag jobbaviseringar via e-post?", a: "Gå till /profile → Jobbtips. Välj dagligen, veckovis eller månadsvis, antal jobb, ort och lägsta matchning, eller skriv t.ex. \"5 logistikjobb i Göteborg varje dag\" och tryck Fyll i, sedan Spara." },
    { q: "Vad kostar det?", a: "" },
    { q: "CV-uppladdningen misslyckas", a: "Kontrollera att filen är PDF, Word (.docx) eller text och under 4 MB. På mobilen: spara filen i telefonen först (inte bara i Google Drive, WhatsApp eller iCloud), använd wifi och försök igen på /profile. Ett fotograferat CV går inte att läsa; exportera det som PDF från Word i stället." },
  ],
});

/** The "What does it cost?" answer depends on whether paid plans are live (passed from the server). */
export function costAnswer(locale: "en" | "sv", p: { paywall: boolean; pro: number; premium: number; trialDays: number }) {
  if (!p.paywall) {
    return locale === "sv"
      ? "Just nu är allt gratis under betan, för alla, och vi ber aldrig om kort. Betalplaner är förberedda (Basic förblir gratis) och vi meddelar i god tid innan något ändras. Se /pricing."
      : "Right now everything is free during the beta, for everyone, and we never ask for a card. Paid plans are prepared (Basic stays free) and we'll tell you well in advance before anything changes. See /pricing.";
  }
  const trial = p.trialDays > 0 ? (locale === "sv" ? ` Nya konton får ${p.trialDays} dagar Pro gratis.` : ` New accounts get ${p.trialDays} days of Pro free.`) : "";
  return locale === "sv"
    ? `Basic är gratis. Pro kostar ${p.pro} kr/mån och Premium ${p.premium} kr/mån, billigare för 3 eller 12 månader. Säg upp när du vill på /account.${trial} Se /pricing.`
    : `Basic is free. Pro is ${p.pro} kr/month and Premium ${p.premium} kr/month, cheaper for 3 or 12 months. Cancel any time on /account.${trial} See /pricing.`;
}

export type Piece = { text: string } | { href: string; text: string };

const KNOWN = ["/signup", "/login", "/profile", "/jobs", "/applications", "/activity-report", "/career", "/dashboard", "/pricing", "/account", "/faq", "/privacy", "/terms", "/onboarding"];

/** Split an answer into text and links: known site paths, full jobfitwise.se URLs, and @jobfitwise.se addresses (mailto). */
export function linkify(answer: string): Piece[] {
  const out: Piece[] = [];
  const re = /([\w.+-]+@jobfitwise\.se)|(https?:\/\/(?:www\.)?jobfitwise\.se(\/[\w\-/]*)?)|((?<![\w.@])\/[a-z][\w\-]*(?:\/[\w\-]+)*)/gi;
  let last = 0;
  for (const m of answer.matchAll(re)) {
    const raw = m[0].replace(/[.,;:)]+$/, "");
    if (m[1]) {
      const at = m.index ?? 0;
      if (at > last) out.push({ text: answer.slice(last, at) });
      out.push({ href: `mailto:${raw}`, text: raw });
      last = at + raw.length;
      continue;
    }
    const path = m[2] ? (m[3] || "/") : raw;
    const ok = path === "/" || KNOWN.some((k) => path === k || path.startsWith(`${k}/`));
    if (!ok) continue;
    const at = m.index ?? 0;
    if (at > last) out.push({ text: answer.slice(last, at) });
    out.push({ href: path, text: raw });
    last = at + raw.length;
  }
  if (last < answer.length) out.push({ text: answer.slice(last) });
  return out;
}
