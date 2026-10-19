import Link from "next/link";
import { PageShell, Prose } from "@/components/marketing/PageShell";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy Policy — Fitwise" };

const UPDATED = "17 October 2026";

export default function PrivacyPage() {
  const contact = site.contactEmail ? (
    <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
  ) : (
    "the contact address on our FAQ page"
  );

  return (
    <PageShell eyebrow="Legal" title="Privacy Policy" intro={<>Last updated {UPDATED}. Written to be read, not skimmed past.</>} narrow>
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
          <li><strong>Technical data:</strong> a session cookie that keeps you signed in, your browser type for each session, and the IP address of failed sign-in attempts (kept for up to 24 hours to stop password guessing).</li>
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
            <tr><td>Supabase</td><td>Database (EU region)</td><td>All account and profile data</td></tr>
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
          We use only cookies that are strictly necessary: one that keeps you signed in, and a short-lived one during
          Google sign-in. No analytics or advertising cookies, so there&apos;s no cookie banner.
        </p>

        <h2>Changes</h2>
        <p>If we change this policy in a meaningful way, we&apos;ll update the date above and tell signed-in users.</p>
      </Prose>
    </PageShell>
  );
}
