import Link from "next/link";
import { PageShell, Prose } from "@/components/marketing/PageShell";
import { site } from "@/lib/site";
import { getLocale } from "@/i18n/server";

const UPDATED = { en: "20 October 2026", sv: "20 oktober 2026" };

export async function generateMetadata() {
  return { title: (await getLocale()) === "sv" ? "Integritetspolicy — Fitwise" : "Privacy Policy — Fitwise" };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const contact = site.contactEmail ? (
    <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
  ) : locale === "sv" ? (
    "kontaktadressen på sidan Vanliga frågor"
  ) : (
    "the contact address on our FAQ page"
  );

  if (locale === "sv") {
    return (
      <PageShell eyebrow="Juridik" title="Integritetspolicy" intro={<>Senast uppdaterad {UPDATED.sv}. Skriven för att läsas, inte för att skummas.</>} narrow>
        <Prose>
          <p>
            Den här policyn förklarar vilka personuppgifter {site.name} samlar in, varför, vem de delas med och vilka
            rättigheter du har enligt EU:s dataskyddsförordning (GDPR).
          </p>

          <h2>Vem som är ansvarig</h2>
          <p>
            {site.operatorName ? <strong>{site.operatorName}</strong> : `Den som driver ${site.name}`}, med säte i Sverige, är
            personuppgiftsansvarig. Kontakt: {contact}.
          </p>

          <h2>Vad vi samlar in</h2>
          <ul>
            <li><strong>Kontouppgifter:</strong> ditt namn och din e-postadress. Loggar du in med Google får vi bara ditt namn, din e-post och ditt Google-konto-ID. Använder du lösenord sparar vi bara en envägs-hash av det.</li>
            <li><strong>Ditt CV och din profil:</strong> texten i det CV du laddar upp, de kompetenser, erfarenheter och den nivå vi läser ut ur det, och de önskemål du anger (målroller, orter, lön).</li>
            <li><strong>Din aktivitet:</strong> jobb du sparar, väljer bort (och varför) eller söker, dina anteckningar och personliga brev.</li>
            <li><strong>Teknisk data:</strong> en sessionscookie som håller dig inloggad, en cookie som kommer ihåg ditt språkval, din webbläsartyp per session, och IP-adressen vid misslyckade inloggningsförsök (sparas i högst 24 timmar för att stoppa lösenordsgissning).</li>
          </ul>

          <h2>Varför vi använder uppgifterna, och med vilken rättslig grund</h2>
          <ul>
            <li><strong>För att leverera tjänsten du registrerat dig för</strong> (avtal, GDPR art. 6.1 b): matcha dig med jobb, räkna ut matchningspoäng, skriva utkast till personliga brev och hålla koll på ansökningar.</li>
            <li><strong>För att hålla tjänsten säker och fungerande</strong> (berättigat intresse, art. 6.1 f): förhindra missbruk, begränsa inloggningsförsök och rätta fel.</li>
          </ul>
          <p>Vi säljer inte din data, visar inte ditt CV för arbetsgivare och använder det inte för reklam.</p>

          <h2>Vilka som behandlar uppgifterna åt oss</h2>
          <p>Vi använder de här leverantörerna för att driva {site.name}. Var och en får bara det den behöver.</p>
          <table>
            <thead>
              <tr><th>Leverantör</th><th>Syfte</th><th>Uppgifter</th></tr>
            </thead>
            <tbody>
              <tr><td>Vercel</td><td>Driftar webbplatsen</td><td>Anrop till webbplatsen</td></tr>
              <tr><td>Supabase</td><td>Databas (EU, Irland)</td><td>All konto- och profildata</td></tr>
              <tr><td>Anthropic</td><td>AI som läser CV:n och skriver personliga brev</td><td>CV-text, profil, jobbtext</td></tr>
              <tr><td>Google</td><td>Inloggning med ”Fortsätt med Google”</td><td>Namn och e-post</td></tr>
              <tr><td>Pinecone (om aktiverat)</td><td>Matchning på innehåll</td><td>Sammanfattning av profilen</td></tr>
              <tr><td>Arbetsförmedlingen (JobTech)</td><td>Hämtar offentliga jobbannonser i Sverige</td><td>Inga personuppgifter</td></tr>
              <tr><td>SerpApi</td><td>Hämtar offentliga jobbannonser</td><td>Inga personuppgifter</td></tr>
            </tbody>
          </table>
          <p>
            Vissa leverantörer finns i USA. Överföringar omfattas av EU–US Data Privacy Framework eller EU-kommissionens
            standardavtalsklausuler.
          </p>

          <h2>Hur länge vi sparar uppgifterna</h2>
          <p>
            Så länge du har ett konto. När du raderar ditt konto raderas din profil, ditt CV, dina ansökningar och din aktivitet
            direkt. Säkerhetskopior hos vår databasleverantör försvinner enligt deras ordinarie schema.
          </p>

          <h2>Dina rättigheter</h2>
          <p>Du kan när som helst:</p>
          <ul>
            <li><strong>Få en kopia av din data:</strong> använd ”Ladda ner min data” på din <Link href="/profile">profil</Link>.</li>
            <li><strong>Rätta den:</strong> ändra din profil direkt.</li>
            <li><strong>Radera den:</strong> använd ”Radera mitt konto” på din profilsida.</li>
            <li><strong>Invända mot eller begränsa behandlingen</strong> genom att kontakta oss på {contact}.</li>
            <li>
              <strong>Klaga</strong> hos Integritetsskyddsmyndigheten (IMY), imy.se, eller tillsynsmyndigheten där du bor.
            </li>
          </ul>

          <h2>Cookies</h2>
          <p>
            Vi använder bara cookies som är nödvändiga: en som håller dig inloggad, en kortlivad under Google-inloggning och en
            som kommer ihåg ditt språkval. Inga analys- eller reklamcookies, därför finns ingen cookie-banner.
          </p>

          <h2>Ändringar</h2>
          <p>Om vi ändrar policyn på ett väsentligt sätt uppdaterar vi datumet ovan och informerar inloggade användare.</p>
          <p className="text-sm">Vid skillnader mellan språkversionerna gäller den svenska.</p>
        </Prose>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Legal" title="Privacy Policy" intro={<>Last updated {UPDATED.en}. Written to be read, not skimmed past.</>} narrow>
      <Prose>
        <p>
          This policy explains what personal data {site.name} collects, why, who it&apos;s shared with, and the rights
          you have under the EU General Data Protection Regulation (GDPR).
        </p>

        <h2>Who is responsible</h2>
        <p>
          {site.operatorName ? <strong>{site.operatorName}</strong> : `The operator of ${site.name}`}, based in {site.country},
          is the data controller. Contact: {contact}.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your name and email address. If you sign in with Google, we receive only your name, email and Google account ID. If you use a password, we store only a one-way hash of it.</li>
          <li><strong>Your resume and profile:</strong> the text of the resume you upload, the skills, experience and seniority we extract from it, and the preferences you set (target roles, locations, salary).</li>
          <li><strong>Your activity:</strong> jobs you save, pass on (and why), apply to, your application notes and cover letters.</li>
          <li><strong>Technical data:</strong> a session cookie that keeps you signed in, a cookie that remembers your language, your browser type for each session, and the IP address of failed sign-in attempts (kept for up to 24 hours to stop password guessing).</li>
        </ul>

        <h2>Why we use it, and on what legal basis</h2>
        <ul>
          <li><strong>To provide the service you signed up for</strong> (contract, GDPR Art. 6(1)(b)): matching you with jobs, scoring your fit, drafting cover letters, tracking applications.</li>
          <li><strong>To keep the service secure and working</strong> (legitimate interests, Art. 6(1)(f)): preventing abuse, limiting sign-in attempts, fixing errors.</li>
        </ul>
        <p>We do not sell your data, show your resume to employers, or use it for advertising.</p>

        <h2>Who processes it for us</h2>
        <p>We use these providers to run {site.name}. Each only receives what it needs.</p>
        <table>
          <thead>
            <tr><th>Provider</th><th>Purpose</th><th>Data involved</th></tr>
          </thead>
          <tbody>
            <tr><td>Vercel</td><td>Hosting the website</td><td>Requests to the site</td></tr>
            <tr><td>Supabase</td><td>Database (EU, Ireland)</td><td>All account and profile data</td></tr>
            <tr><td>Anthropic</td><td>AI that reads resumes and writes cover letters</td><td>Resume text, profile, job text</td></tr>
            <tr><td>Google</td><td>&ldquo;Continue with Google&rdquo; sign-in</td><td>Name and email</td></tr>
            <tr><td>Pinecone (if enabled)</td><td>Matching by meaning</td><td>Profile summary text</td></tr>
            <tr><td>Arbetsförmedlingen (JobTech)</td><td>Collecting public job listings in Sweden</td><td>No personal data</td></tr>
            <tr><td>SerpApi</td><td>Collecting public job listings</td><td>No personal data</td></tr>
          </tbody>
        </table>
        <p>
          Some providers are based in the United States. Transfers are covered by the EU–US Data Privacy Framework
          or the European Commission&apos;s Standard Contractual Clauses.
        </p>

        <h2>How long we keep it</h2>
        <p>
          For as long as you have an account. When you delete your account, your profile, resume, applications and
          activity are erased immediately. Backups held by our database provider expire on their normal schedule.
        </p>

        <h2>Your rights</h2>
        <p>You can, at any time:</p>
        <ul>
          <li><strong>Get a copy of your data:</strong> use &ldquo;Download my data&rdquo; on your <Link href="/profile">Profile</Link> page.</li>
          <li><strong>Correct it:</strong> edit your profile directly.</li>
          <li><strong>Delete it:</strong> use &ldquo;Delete my account&rdquo; on your Profile page.</li>
          <li><strong>Object to or restrict processing</strong>, by contacting us at {contact}.</li>
          <li>
            <strong>Complain</strong> to the Swedish Authority for Privacy Protection (IMY), imy.se, or the data
            protection authority where you live.
          </li>
        </ul>

        <h2>Cookies</h2>
        <p>
          We use only cookies that are strictly necessary: one that keeps you signed in, a short-lived one during
          Google sign-in, and one that remembers your language. No analytics or advertising cookies, so there&apos;s no
          cookie banner.
        </p>

        <h2>Changes</h2>
        <p>If we change this policy in a meaningful way, we&apos;ll update the date above and tell signed-in users.</p>
        <p className="text-sm">If the language versions differ, the Swedish version applies.</p>
      </Prose>
    </PageShell>
  );
}
