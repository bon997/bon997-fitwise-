import Link from "next/link";
import { PageShell, Prose } from "@/components/marketing/PageShell";
import { site } from "@/lib/site";
import { getLocale } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getLocale()) === "sv" ? "Användarvillkor — Fitwise" : "Terms of Use — Fitwise" };
}

export default async function TermsPage() {
  if ((await getLocale()) === "sv") {
    return (
      <PageShell eyebrow="Juridik" title="Användarvillkor" intro="Senast uppdaterade 20 oktober 2026." narrow>
        <Prose>
          <p>
            Genom att skapa ett konto eller använda {site.name} godkänner du de här villkoren. Om du inte godkänner dem,
            använd inte tjänsten.
          </p>

          <h2>Vad {site.name} är</h2>
          <p>
            Ett verktyg som hjälper dig hitta jobb som passar din erfarenhet, visar hur väl du matchar, skriver utkast till
            personliga brev och håller koll på dina ansökningar. Det är varken rekryterare eller arbetsgivare och söker inte
            jobb åt dig.
          </p>

          <h2>Ditt konto</h2>
          <ul>
            <li>Du måste vara minst 16 år.</li>
            <li>Håll dina inloggningsuppgifter för dig själv. Du ansvarar för det som görs på ditt konto.</li>
            <li>Ladda bara upp ditt eget CV och uppgifter som är sanna.</li>
          </ul>

          <h2>AI-genererat innehåll</h2>
          <p>
            Matchningspoäng, förklaringar och personliga brev skapas automatiskt och kan vara felaktiga eller ofullständiga.
            Granska allt innan du förlitar dig på det eller skickar det till en arbetsgivare. Du ansvarar för det du skickar.
          </p>

          <h2>Jobbannonser</h2>
          <p>
            Annonserna kommer från offentliga källor. Vi garanterar inte att ett jobb är korrekt beskrivet, fortfarande
            sökbart eller att du blir anställd. Kontrollera alltid uppgifterna på arbetsgivarens egen sida.
          </p>

          <h2>Rimlig användning</h2>
          <p>
            Missbruka inte tjänsten: ingen automatisk skrapning, inga försök att kringgå säkerheten och ingen användning som
            skadar andra. För att {site.name} ska kunna vara gratis har AI-funktionerna dagliga gränser (se{" "}
            <Link href="/pricing">Priser</Link>). Vi kan stänga av konton som bryter mot reglerna.
          </p>

          <h2>Ditt innehåll och din data</h2>
          <p>
            Du äger ditt CV och allt du skriver. Du ger oss rätt att behandla det enbart för att leverera tjänsten, enligt vår{" "}
            <Link href="/privacy">integritetspolicy</Link>. Du kan radera ditt konto när du vill.
          </p>

          <h2>Tillgänglighet och ansvar</h2>
          <p>
            {site.name} erbjuds kostnadsfritt under betan, ”i befintligt skick”, och kan ändras eller tidvis vara otillgänglig.
            I den utsträckning lagen tillåter ansvarar vi inte för indirekta förluster, som en missad jobbmöjlighet. Inget i
            villkoren begränsar dina rättigheter enligt konsumentlagstiftningen.
          </p>

          <h2>Ändringar och tillämplig lag</h2>
          <p>Vi kan uppdatera villkoren och ändrar då datumet ovan. Svensk lag gäller.</p>
        </Prose>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Legal" title="Terms of Use" intro="Last updated 20 October 2026." narrow>
      <Prose>
        <p>
          By creating an account or using {site.name}, you agree to these terms. If you don&apos;t agree, please
          don&apos;t use the service.
        </p>

        <h2>What {site.name} is</h2>
        <p>
          A tool that helps you find jobs that fit your experience, explains how well you match, drafts cover letters,
          and tracks your applications. It is not a recruiter or employer, and it does not apply to jobs on your behalf.
        </p>

        <h2>Your account</h2>
        <ul>
          <li>You must be at least 16 years old.</li>
          <li>Keep your sign-in details to yourself. You&apos;re responsible for activity on your account.</li>
          <li>Upload only your own resume and information that&apos;s true.</li>
        </ul>

        <h2>AI-generated content</h2>
        <p>
          Fit scores, explanations and cover letters are produced automatically and can be wrong or incomplete.
          Review everything before you rely on it or send it to an employer. You are responsible for what you send.
        </p>

        <h2>Job listings</h2>
        <p>
          Listings come from public sources. We don&apos;t guarantee that a job is accurate, still open, or that you
          will be hired. Always check details on the employer&apos;s own site.
        </p>

        <h2>Fair use</h2>
        <p>
          Don&apos;t misuse the service: no automated scraping, no attempts to break security, no using it to harm
          others. To keep {site.name} free, AI features have daily limits (see <Link href="/pricing">Pricing</Link>).
          We may suspend accounts that break these rules.
        </p>

        <h2>Your content and data</h2>
        <p>
          You own your resume and anything you write. You give us permission to process it only to provide the
          service, as described in our <Link href="/privacy">Privacy Policy</Link>. You can delete your account at any time.
        </p>

        <h2>Availability and liability</h2>
        <p>
          {site.name} is provided free of charge during beta, &ldquo;as is&rdquo;, and may change or be unavailable at
          times. To the extent the law allows, we are not liable for indirect losses, such as a missed job opportunity.
          Nothing in these terms limits rights you have under consumer law.
        </p>

        <h2>Changes and law</h2>
        <p>
          We may update these terms and will change the date above when we do. Swedish law applies.
        </p>
      </Prose>
    </PageShell>
  );
}
