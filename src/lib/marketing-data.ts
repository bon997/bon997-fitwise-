// Landing page content. Everything here must be true: no invented numbers, quotes or customer names.
import { defineT } from "@/i18n/config";

export const MARKETING = defineT({
  en: {
    /** Short promises shown under the hero. */
    promises: ["Free during beta", "No credit card", "Your resume is never sold", "Delete your data any time"],
    /** Facts about how the product works (not usage claims, which we can't back up yet). */
    stats: [
      { value: "5", label: "signals behind every fit score" },
      { value: "2×", label: "weight on a job's must-have skills" },
      { value: "0", label: "resumes shown to employers or sold" },
      { value: "1 click", label: "to download or delete your data" },
    ],
    steps: [
      { n: "01", title: "Upload your resume", body: "We parse it into skills, seniority and experience — you review and correct anything we got wrong." },
      { n: "02", title: "Get scored matches", body: "Every listing gets a fit score with the exact skills you match and the ones you're missing." },
      { n: "03", title: "Apply with a tailored letter", body: "One click drafts a cover letter grounded in your real experience. Edit, send, and track it." },
    ],
    /** Shown in place of testimonials until there are real ones. */
    principles: [
      { title: "Honest scores", body: "Your fit score only measures how well you meet a job's requirements. Your preferences can reorder results, but never inflate the number." },
      { title: "Nothing made up", body: "Cover letters are written only from experience in your resume. No invented results, no fake numbers. You review every word before it's sent." },
      { title: "Your data, your call", body: "Your resume is used only to match you with jobs. Download everything or delete your account from your profile, any time." },
    ],
  },
  sv: {
    promises: ["Gratis under beta", "Inget kreditkort", "Ditt CV säljs aldrig", "Radera din data när du vill"],
    stats: [
      { value: "5", label: "faktorer bakom varje matchningspoäng" },
      { value: "2×", label: "vikt på jobbets krav-kompetenser" },
      { value: "0", label: "CV:n som visas för arbetsgivare eller säljs" },
      { value: "1 klick", label: "för att ladda ner eller radera din data" },
    ],
    steps: [
      { n: "01", title: "Ladda upp ditt CV", body: "Vi läser ut kompetenser, nivå och erfarenhet — du granskar och rättar det vi missat." },
      { n: "02", title: "Få matchningar med poäng", body: "Varje annons får en matchningspoäng som visar exakt vilka kompetenser du har och vilka som saknas." },
      { n: "03", title: "Sök med ett anpassat brev", body: "Ett klick skapar ett utkast till personligt brev byggt på din riktiga erfarenhet. Redigera, skicka och följ upp." },
    ],
    principles: [
      { title: "Ärliga poäng", body: "Matchningspoängen mäter bara hur väl du uppfyller jobbets krav. Dina önskemål kan ändra ordningen, men aldrig blåsa upp siffran." },
      { title: "Inget påhittat", body: "Personliga brev skrivs bara utifrån erfarenhet i ditt CV. Inga påhittade resultat eller siffror. Du granskar varje ord innan du skickar." },
      { title: "Din data, ditt val", body: "Ditt CV används bara för att matcha dig med jobb. Ladda ner allt eller radera ditt konto från din profil, när du vill." },
    ],
  },
});

/**
 * Real quotes only, with the person's permission. The section stays hidden
 * while this list is empty. Example shape:
 * { quote: "…", name: "First name + initial", role: "Their role" }
 */
export const testimonials: { quote: string; name: string; role: string }[] = [];
