import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotForm } from "@/components/auth/PasswordForms";
import { emailConfigured } from "@/lib/email";
import { site } from "@/lib/site";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Forgot password — Fitwise",
    title: "Forgot your password?",
    sub: "Enter the email you signed up with and we'll send you a link to choose a new one.",
    off: "Password reset by email isn't switched on yet.",
    gmail: "If you use Gmail, sign in with “Continue with Google”. It works even if you first signed up with a password.",
    contact: "Otherwise, email us at",
    back: "← Back to sign in",
  },
  sv: {
    meta: "Glömt lösenordet — Fitwise",
    title: "Glömt lösenordet?",
    sub: "Skriv e-postadressen du registrerade dig med så skickar vi en länk där du väljer ett nytt.",
    off: "Återställning via e-post är inte påslagen än.",
    gmail: "Använder du Gmail kan du logga in med ”Fortsätt med Google”. Det fungerar även om du först skapade kontot med lösenord.",
    contact: "Annars kan du mejla oss på",
    back: "← Tillbaka till inloggningen",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
}

export default async function ForgotPasswordPage() {
  const t = T[await getLocale()];
  return (
    <AuthCard title={t.title} sub={emailConfigured() ? t.sub : undefined} footer={<Link href="/login" className="hover:text-ink">{t.back}</Link>}>
      {emailConfigured() ? (
        <ForgotForm />
      ) : (
        <div className="space-y-3 text-sm text-ink-2">
          <p className="font-medium text-ink">{t.off}</p>
          <p>{t.gmail}</p>
          {site.contactEmail && (
            <p>
              {t.contact} <span className="select-all font-medium text-ink">{site.contactEmail}</span>.
            </p>
          )}
        </div>
      )}
    </AuthCard>
  );
}
