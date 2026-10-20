import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { AI_DAILY_LIMITS, site } from "@/lib/site";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

type Faq = { q: string; a: React.ReactNode };

const T = defineT({
  en: {
    metaTitle: "FAQ — Fitwise",
    metaDescription: "How Fitwise scores your fit, where jobs come from, what happens to your resume, and more.",
    eyebrow: "FAQ",
    title: "Questions, answered.",
    stillTitle: "Still have a question?",
    emailUs: "Email us at",
    weRead: "We read everything.",
    noInbox: "We're setting up a support inbox. In the meantime, everything about your data can be managed from your Profile page.",
    faqs: [
      {
        q: "How is my fit score calculated?",
        a: (
          <>
            <p>
              Every job gets a score from 0 to 100 based on five things: your skills compared with the job&apos;s skills
              (45%), how closely your background matches the role (20%), years of experience (15%), seniority level (10%)
              and location (10%). Required skills count double, and a related skill (for example PostgreSQL when a job
              asks for SQL) earns half credit.
            </p>
            <p className="mt-3">
              Missing a required skill caps the score, because you can&apos;t be a near-perfect fit without the
              must-haves. Each job page shows the full breakdown, so you can see exactly why.
            </p>
          </>
        ),
      },
      {
        q: "What's the difference between “Best fit” and “For you”?",
        a: (
          <p>
            <strong>Best fit</strong> sorts purely by the fit score. <strong>For you</strong> also uses your preferences
            and the jobs you&apos;ve saved, applied to or passed on, and nudges the order by up to 15 points. It never
            changes the fit score itself, and every nudge is explained on the job card.
          </p>
        ),
      },
      {
        q: "Where do the jobs come from?",
        a: (
          <p>
            From public job listings: Platsbanken, the Swedish Public Employment Service&apos;s job board, and Google Jobs
            search. Each job links to the employer&apos;s own application page.
          </p>
        ),
      },
      {
        q: "Does Fitwise apply to jobs for me?",
        a: (
          <p>
            No. Fitwise drafts a cover letter from your real experience. You read it, edit it, and send the application
            yourself on the employer&apos;s site. Then mark it as applied to track it.
          </p>
        ),
      },
      {
        q: "Will the AI make things up in my cover letter?",
        a: (
          <p>
            It&apos;s instructed to use only the experience and skills in your resume and never invent results or numbers.
            AI can still make mistakes, so always read the letter before you send it.
          </p>
        ),
      },
      {
        q: "Can I use Fitwise in Swedish or English?",
        a: (
          <p>
            Both. Switch with the SV / EN buttons at the top of every page. Cover letters can be written in either
            language, whichever the job ad uses.
          </p>
        ),
      },
      {
        q: "What happens to my resume?",
        a: (
          <p>
            It&apos;s used only to build your profile and match you with jobs. We never sell it or show it to employers.
            You can download everything we hold about you, or delete your account and all your data, from your Profile
            page at any time. Details are in our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        ),
      },
      {
        q: "Which file types can I upload?",
        a: (
          <p>
            PDF, Word (.docx) and plain text, up to 4 MB. Older .doc files need to be saved as .docx or PDF first. You can
            also skip the upload and type your skills by hand.
          </p>
        ),
      },
      {
        q: "Is it really free? Are there limits?",
        a: (
          <p>
            Yes, it&apos;s free during the beta. To keep it that way, AI features have daily limits: {AI_DAILY_LIMITS.cover_letter}{" "}
            cover letters and {AI_DAILY_LIMITS.resume_parse} resume uploads per day. Searching jobs and fit scores are
            unlimited. See <Link href="/pricing">Pricing</Link>.
          </p>
        ),
      },
      {
        q: "Why is my score low for a job I'm sure I can do?",
        a: (
          <p>
            Usually because a skill is missing from your profile or named differently. Open your Profile, add the skills
            you actually have, and scores update straight away.
          </p>
        ),
      },
    ] as Faq[],
  },
  sv: {
    metaTitle: "Vanliga frågor — Fitwise",
    metaDescription: "Hur Fitwise räknar ut din matchning, var jobben kommer ifrån, vad som händer med ditt CV och mer.",
    eyebrow: "Vanliga frågor",
    title: "Frågor och svar.",
    stillTitle: "Har du fler frågor?",
    emailUs: "Mejla oss på",
    weRead: "Vi läser allt.",
    noInbox: "Vi håller på att sätta upp en supportadress. Under tiden kan du hantera allt om din data från din profilsida.",
    faqs: [
      {
        q: "Hur räknas min matchningspoäng ut?",
        a: (
          <>
            <p>
              Varje jobb får en poäng från 0 till 100 utifrån fem saker: dina kompetenser jämfört med jobbets (45 %), hur väl
              din bakgrund matchar rollen (20 %), antal års erfarenhet (15 %), nivå (10 %) och plats (10 %). Krav-kompetenser
              väger dubbelt, och en närliggande kompetens (till exempel PostgreSQL när jobbet kräver SQL) ger halv poäng.
            </p>
            <p className="mt-3">
              Saknar du en krav-kompetens begränsas poängen, eftersom du inte kan vara en nästan perfekt match utan
              grundkraven. Varje jobbsida visar hela uppdelningen, så att du ser exakt varför.
            </p>
          </>
        ),
      },
      {
        q: "Vad är skillnaden mellan ”Bäst matchning” och ”För dig”?",
        a: (
          <p>
            <strong>Bäst matchning</strong> sorterar enbart efter matchningspoängen. <strong>För dig</strong> tar också hänsyn
            till dina önskemål och de jobb du sparat, sökt eller valt bort, och flyttar ordningen med högst 15 poäng. Själva
            matchningspoängen ändras aldrig, och varje justering förklaras på jobbkortet.
          </p>
        ),
      },
      {
        q: "Var kommer jobben ifrån?",
        a: (
          <p>
            Från offentliga jobbannonser: Platsbanken (Arbetsförmedlingen) och Google Jobs. Varje jobb länkar till
            arbetsgivarens egen ansökningssida.
          </p>
        ),
      },
      {
        q: "Söker Fitwise jobb åt mig?",
        a: (
          <p>
            Nej. Fitwise skriver ett utkast till personligt brev utifrån din riktiga erfarenhet. Du läser, redigerar och skickar
            ansökan själv på arbetsgivarens sida. Markera den sedan som sökt för att följa upp den.
          </p>
        ),
      },
      {
        q: "Hittar AI:n på saker i mitt personliga brev?",
        a: (
          <p>
            Den är instruerad att bara använda erfarenhet och kompetenser från ditt CV och aldrig hitta på resultat eller
            siffror. AI kan ändå göra fel, så läs alltid brevet innan du skickar det.
          </p>
        ),
      },
      {
        q: "Kan jag använda Fitwise på svenska eller engelska?",
        a: (
          <p>
            Båda. Byt med knapparna SV / EN högst upp på varje sida. Personliga brev kan skrivas på båda språken, beroende på
            vilket språk annonsen är skriven på.
          </p>
        ),
      },
      {
        q: "Vad händer med mitt CV?",
        a: (
          <p>
            Det används bara för att bygga din profil och matcha dig med jobb. Vi säljer det aldrig och visar det aldrig för
            arbetsgivare. Du kan ladda ner allt vi har om dig, eller radera ditt konto och all din data, från din profilsida
            när du vill. Mer information finns i vår <Link href="/privacy">integritetspolicy</Link>.
          </p>
        ),
      },
      {
        q: "Vilka filtyper kan jag ladda upp?",
        a: (
          <p>
            PDF, Word (.docx) och vanlig text, upp till 4 MB. Äldre .doc-filer behöver först sparas som .docx eller PDF. Du kan
            också hoppa över uppladdningen och skriva in dina kompetenser själv.
          </p>
        ),
      },
      {
        q: "Är det verkligen gratis? Finns det gränser?",
        a: (
          <p>
            Ja, det är gratis under betan. För att det ska förbli så har AI-funktionerna dagliga gränser:{" "}
            {AI_DAILY_LIMITS.cover_letter} personliga brev och {AI_DAILY_LIMITS.resume_parse} CV-uppladdningar per dag. Jobbsökning
            och matchningspoäng är obegränsade. Se <Link href="/pricing">Priser</Link>.
          </p>
        ),
      },
      {
        q: "Varför får jag låg poäng på ett jobb jag vet att jag klarar?",
        a: (
          <p>
            Oftast för att en kompetens saknas i din profil eller heter något annat. Öppna din profil, lägg till de kompetenser
            du faktiskt har, så uppdateras poängen direkt.
          </p>
        ),
      },
    ] as Faq[],
  },
});

export async function generateMetadata() {
  const t = T[await getLocale()];
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function FaqPage() {
  const t = T[await getLocale()];
  return (
    <PageShell eyebrow={t.eyebrow} title={t.title} narrow>
      <div className="divide-y divide-line border-y border-line">
        {t.faqs.map(({ q, a }) => (
          <details key={q} className="group py-5 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <span className="mt-1 shrink-0 text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="mt-3 leading-relaxed text-ink-2">{a}</div>
          </details>
        ))}
      </div>

      <section id="contact" className="mt-12 scroll-mt-24 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">{t.stillTitle}</h2>
        <p className="mt-2 text-ink-2">
          {site.contactEmail ? (
            <>
              {t.emailUs}{" "}
              <a href={`mailto:${site.contactEmail}`} className="text-accent underline underline-offset-2">{site.contactEmail}</a>.{" "}
              {t.weRead}
            </>
          ) : (
            t.noInbox
          )}
        </p>
      </section>
    </PageShell>
  );
}
