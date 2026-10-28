import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetForm } from "@/components/auth/PasswordForms";
import { resetTokenValid } from "@/lib/password-reset";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Choose a new password — Fitwise",
    title: "Choose a new password",
    sub: "You'll be signed out on every other device.",
    expired: "This link has expired or was already used. Links work once, for one hour.",
    again: "Send a new link",
    back: "← Back to sign in",
  },
  sv: {
    meta: "Välj ett nytt lösenord — Fitwise",
    title: "Välj ett nytt lösenord",
    sub: "Du loggas ut på alla andra enheter.",
    expired: "Länken har gått ut eller redan använts. Länkar fungerar en gång, i en timme.",
    again: "Skicka en ny länk",
    back: "← Tillbaka till inloggningen",
  },
});

// The token is in the address: never send it on to other sites, never index the page.
export async function generateMetadata() {
  return { title: T[await getLocale()].meta, referrer: "no-referrer" as const, robots: { index: false } };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token = "" }, locale] = await Promise.all([searchParams, getLocale()]);
  const t = T[locale];
  const valid = await resetTokenValid(token);
  return (
    <AuthCard title={t.title} sub={valid ? t.sub : undefined} footer={<Link href="/login" className="hover:text-ink">{t.back}</Link>}>
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4 text-sm">
          <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2.5 text-warn">{t.expired}</p>
          <Link href="/forgot-password" className="block w-full rounded-full bg-ink px-5 py-3 text-center font-medium text-paper hover:bg-ink-2">{t.again}</Link>
        </div>
      )}
    </AuthCard>
  );
}
