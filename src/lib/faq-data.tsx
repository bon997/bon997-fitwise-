import Link from "next/link";
import { AI_DAILY_LIMITS } from "@/lib/site";
import { defineT } from "@/i18n/config";

export type Faq = { id: string; q: string; a: React.ReactNode };

/** Live numbers shown in the answers. */
export type FaqFacts = { activeJobs: number | null };

const n = (x: number, locale: "sv-SE" | "en-GB") => x.toLocaleString(locale);

/**
 * The FAQ, in the order people ask. The first seven also appear on the home page.
 * Answers must stay true to what Fitwise does today — update them when features change.
 */
export const FAQ = defineT({
  en: (f: FaqFacts): Faq[] => [
    {
      id: "auto-apply",
      q: "Do you apply to jobs for me automatically?",
      a: (
        <p>
          No, and that&apos;s on purpose. Fitwise finds the jobs that fit you and drafts a cover letter from your real
          experience. You read it, change what you like, and send the application yourself on the employer&apos;s site.
          Then tap &ldquo;I&apos;ve applied&rdquo; to track it. Mass auto-applying tends to send weak applications to the
          wrong jobs; we&apos;d rather help you send fewer, better ones.
        </p>
      ),
    },
    {
      id: "matches",
      q: "How many jobs do you search, and how do you find my matches?",
      a: (
        <>
          <p>
            We collect public listings from Platsbanken (Arbetsförmedlingen&apos;s job board) and Google Jobs
            {f.activeJobs ? <>, and there are <strong>{n(f.activeJobs, "en-GB")} open jobs</strong> on Fitwise right now</> : ""}.
            Each ad is read by AI to pull out the skills it asks for.
          </p>
          <p className="mt-3">
            Then every job gets a fit score from 0 to 100 against your profile: your skills, your background, years of
            experience, level and location. &ldquo;For you&rdquo; also learns from the jobs you save, apply to or pass on.
            Every job page shows exactly why it scored the way it did.
          </p>
        </>
      ),
    },
    {
      id: "guarantee",
      q: "Do you guarantee I'll get interviews or a job offer?",
      a: (
        <p>
          No. Nobody honest can. The decision is always the employer&apos;s. What Fitwise does is help you spend your time
          on jobs you actually fit, show which skills you&apos;re missing, and give you a strong first draft of each
          letter, so every application you send is a good one.
        </p>
      ),
    },
    {
      id: "cost",
      q: "What will I be charged, and when?",
      a: (
        <p>
          Nothing. Fitwise is free during the beta and we never ask for a card. To keep it free, AI features have daily
          limits: {AI_DAILY_LIMITS.cover_letter} cover letters and {AI_DAILY_LIMITS.resume_parse} resume uploads per day.
          Searching jobs and fit scores are unlimited. If paid plans ever come, we&apos;ll tell you well in advance and
          you&apos;ll choose; nothing is charged without your agreement. See <Link href="/pricing">Pricing</Link>.
        </p>
      ),
    },
    {
      id: "cancel",
      q: "How do I cancel, and will I lose access right away?",
      a: (
        <p>
          There&apos;s no subscription to cancel, so you can simply stop using Fitwise and keep your account. If you want
          to leave for good, use &ldquo;Delete my account&rdquo; on your <Link href="/profile">Profile</Link> page. That
          removes your profile, resume, applications and saved jobs immediately, so download your data first if you want
          a copy.
        </p>
      ),
    },
    {
      id: "ai-letters",
      q: "Will employers know my application was written with AI?",
      a: (
        <>
          <p>
            We never contact employers and never label your letter. It&apos;s a draft on your screen, and what you send is
            up to you. The AI only uses experience from your own resume and never invents results or numbers.
          </p>
          <p className="mt-3">
            Some employers do use tools that try to spot AI text, and recruiters notice generic letters. The best letters
            are the ones you make your own: add a detail only you would know, and change anything that doesn&apos;t sound
            like you.
          </p>
        </>
      ),
    },
    {
      id: "privacy",
      q: "Is my data safe and private?",
      a: (
        <p>
          Yes. Your data is encrypted in transit and at rest, stored in the EU (Ireland), never sold, never shown to employers, and
          used only to match you with jobs and draft your letters. You can download everything we hold about you, or
          delete your whole account, at any time from your Profile page. Details are in our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      ),
    },
    {
      id: "score",
      q: "How exactly is my fit score calculated?",
      a: (
        <>
          <p>
            Five parts: your skills compared with the job&apos;s skills (45%), how closely your background matches the role
            (20%), years of experience (15%), level (10%) and location (10%). Required skills count double, and a related
            skill (for example PostgreSQL when a job asks for SQL) earns half credit.
          </p>
          <p className="mt-3">
            Missing a required skill caps the score, because you can&apos;t be a near-perfect fit without the must-haves.
          </p>
        </>
      ),
    },
    {
      id: "low-score",
      q: "Why is my score low for a job I'm sure I can do?",
      a: (
        <p>
          Usually because a skill is missing from your profile or named differently. Open your Profile, add the skills you
          actually have, and scores update straight away.
        </p>
      ),
    },
    {
      id: "for-you",
      q: "What's the difference between “Best fit” and “For you”?",
      a: (
        <p>
          <strong>Best fit</strong> sorts purely by the fit score. <strong>For you</strong> also uses your preferences and
          the jobs you&apos;ve saved, applied to or passed on, and moves jobs by up to 15 points. It never changes the fit
          score itself, and every nudge is explained on the job card.
        </p>
      ),
    },
    {
      id: "language",
      q: "Can I use Fitwise in Swedish or English?",
      a: (
        <p>
          Both. Switch with the SV / EN buttons at the top of every page. Cover letters can be written in either language,
          whichever the job ad uses.
        </p>
      ),
    },
    {
      id: "files",
      q: "Which file types can I upload?",
      a: (
        <p>
          PDF, Word (.docx) and plain text, up to 4 MB. Older .doc files need to be saved as .docx or PDF first. You can
          also skip the upload and type your skills by hand.
        </p>
      ),
    },
  ],
  sv: (f: FaqFacts): Faq[] => [
    {
      id: "auto-apply",
      q: "Söker ni jobb åt mig automatiskt?",
      a: (
        <p>
          Nej, och det är med flit. Fitwise hittar jobben som passar dig och skriver ett utkast till personligt brev utifrån
          din riktiga erfarenhet. Du läser, ändrar det du vill och skickar ansökan själv på arbetsgivarens sida. Tryck sedan
          på ”Jag har sökt” för att följa upp den. Automatiska massansökningar skickar oftast svaga ansökningar till fel
          jobb; vi hjälper dig hellre att skicka färre och bättre.
        </p>
      ),
    },
    {
      id: "matches",
      q: "Hur många jobb söker ni bland, och hur hittar ni mina matchningar?",
      a: (
        <>
          <p>
            Vi hämtar offentliga annonser från Platsbanken (Arbetsförmedlingen) och Google Jobs
            {f.activeJobs ? <>, och just nu finns <strong>{n(f.activeJobs, "sv-SE")} lediga jobb</strong> på Fitwise</> : ""}.
            Varje annons läses av AI som plockar ut vilka kompetenser som efterfrågas.
          </p>
          <p className="mt-3">
            Sedan får varje jobb en matchningspoäng från 0 till 100 mot din profil: dina kompetenser, din bakgrund, antal års
            erfarenhet, nivå och ort. ”För dig” lär sig också av jobben du sparar, söker eller väljer bort. Varje jobbsida
            visar exakt varför poängen blev som den blev.
          </p>
        </>
      ),
    },
    {
      id: "guarantee",
      q: "Garanterar ni att jag får intervjuer eller ett jobberbjudande?",
      a: (
        <p>
          Nej. Det kan ingen ärlig tjänst lova, beslutet är alltid arbetsgivarens. Det Fitwise gör är att hjälpa dig lägga
          tiden på jobb du faktiskt passar för, visa vilka kompetenser du saknar och ge dig ett starkt första utkast till
          varje brev, så att varje ansökan du skickar är en bra ansökan.
        </p>
      ),
    },
    {
      id: "cost",
      q: "Vad kostar det, och när betalar jag?",
      a: (
        <p>
          Ingenting. Fitwise är gratis under betan och vi ber aldrig om kortuppgifter. För att det ska förbli gratis har
          AI-funktionerna dagliga gränser: {AI_DAILY_LIMITS.cover_letter} personliga brev och {AI_DAILY_LIMITS.resume_parse}{" "}
          CV-uppladdningar per dag. Jobbsökning och matchningspoäng är obegränsade. Om det någon gång blir betalplaner
          berättar vi det i god tid och du väljer själv; inget dras utan att du har godkänt det. Se{" "}
          <Link href="/pricing">Priser</Link>.
        </p>
      ),
    },
    {
      id: "cancel",
      q: "Hur avslutar jag, och förlorar jag tillgången direkt?",
      a: (
        <p>
          Det finns inget abonnemang att säga upp, så du kan helt enkelt sluta använda Fitwise och behålla kontot. Vill du
          lämna för gott använder du ”Radera mitt konto” på din <Link href="/profile">profilsida</Link>. Då raderas din
          profil, ditt CV, dina ansökningar och sparade jobb direkt, så ladda ner din data först om du vill ha en kopia.
        </p>
      ),
    },
    {
      id: "ai-letters",
      q: "Kommer arbetsgivare att märka att ansökan skrevs med AI?",
      a: (
        <>
          <p>
            Vi kontaktar aldrig arbetsgivare och märker aldrig ditt brev. Det är ett utkast på din skärm, och vad du skickar
            bestämmer du. AI:n använder bara erfarenhet från ditt eget CV och hittar aldrig på resultat eller siffror.
          </p>
          <p className="mt-3">
            Vissa arbetsgivare använder verktyg som försöker upptäcka AI-text, och rekryterare känner igen generiska brev.
            De bästa breven är de du gör till dina egna: lägg till en detalj som bara du vet, och ändra det som inte låter
            som du.
          </p>
        </>
      ),
    },
    {
      id: "privacy",
      q: "Är min data säker och privat?",
      a: (
        <p>
          Ja. Din data krypteras både under överföring och när den lagras, sparas inom EU (Irland), säljs aldrig, visas aldrig för
          arbetsgivare och används bara för att matcha dig med jobb och skriva dina brev. Du kan ladda ner allt vi har om dig,
          eller radera hela kontot, när du vill från din profilsida. Mer finns i vår{" "}
          <Link href="/privacy">integritetspolicy</Link>.
        </p>
      ),
    },
    {
      id: "score",
      q: "Exakt hur räknas min matchningspoäng ut?",
      a: (
        <>
          <p>
            Fem delar: dina kompetenser jämfört med jobbets (45 %), hur väl din bakgrund matchar rollen (20 %), antal års
            erfarenhet (15 %), nivå (10 %) och ort (10 %). Krav-kompetenser väger dubbelt, och en närliggande kompetens (till
            exempel PostgreSQL när jobbet kräver SQL) ger halv poäng.
          </p>
          <p className="mt-3">
            Saknar du en krav-kompetens begränsas poängen, eftersom du inte kan vara en nästan perfekt match utan grundkraven.
          </p>
        </>
      ),
    },
    {
      id: "low-score",
      q: "Varför får jag låg poäng på ett jobb jag vet att jag klarar?",
      a: (
        <p>
          Oftast för att en kompetens saknas i din profil eller heter något annat. Öppna din profil, lägg till de kompetenser
          du faktiskt har, så uppdateras poängen direkt.
        </p>
      ),
    },
    {
      id: "for-you",
      q: "Vad är skillnaden mellan ”Bäst matchning” och ”För dig”?",
      a: (
        <p>
          <strong>Bäst matchning</strong> sorterar enbart efter matchningspoängen. <strong>För dig</strong> tar också hänsyn
          till dina önskemål och de jobb du sparat, sökt eller valt bort, och flyttar jobb med högst 15 poäng. Själva
          matchningspoängen ändras aldrig, och varje justering förklaras på jobbkortet.
        </p>
      ),
    },
    {
      id: "language",
      q: "Kan jag använda Fitwise på svenska eller engelska?",
      a: (
        <p>
          Båda. Byt med knapparna SV / EN högst upp på varje sida. Personliga brev kan skrivas på båda språken, beroende på
          vilket språk annonsen är skriven på.
        </p>
      ),
    },
    {
      id: "files",
      q: "Vilka filtyper kan jag ladda upp?",
      a: (
        <p>
          PDF, Word (.docx) och vanlig text, upp till 4 MB. Äldre .doc-filer behöver först sparas som .docx eller PDF. Du kan
          också hoppa över uppladdningen och skriva in dina kompetenser själv.
        </p>
      ),
    },
  ],
});
