import Link from "next/link";
import { PageShell, Prose } from "@/components/marketing/PageShell";
import { site } from "@/lib/site";

export const metadata = { title: "Terms of Use — Fitwise" };

export default function TermsPage() {
  return (
    <PageShell eyebrow="Legal" title="Terms of Use" intro="Last updated 17 October 2026." narrow>
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
