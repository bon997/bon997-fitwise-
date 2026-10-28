import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { confirmEmail } from "@/lib/email-verify";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Confirm email — Fitwise",
    ok: "Email confirmed",
    okSub: "Thanks. Your weekly job matches will arrive by email. You can turn them off on your profile or from any email.",
    bad: "This link has expired or was already used",
    badSub: "If your email is already confirmed, there's nothing more to do. Otherwise, ask for a new link from your dashboard.",
    go: "Go to my dashboard",
    signIn: "Sign in",
  },
  sv: {
    meta: "Bekräfta e-post — Fitwise",
    ok: "E-posten är bekräftad",
    okSub: "Tack. Dina veckovisa jobbmatchningar kommer med e-post. Du kan stänga av dem på din profil eller från vilket mejl som helst.",
    bad: "Länken har gått ut eller redan använts",
    badSub: "Är din e-post redan bekräftad behöver du inte göra något mer. Annars kan du be om en ny länk från din översikt.",
    go: "Till min översikt",
    signIn: "Logga in",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta, referrer: "no-referrer" as const, robots: { index: false } };
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token = "" }, locale, user] = await Promise.all([searchParams, getLocale(), getCurrentUser()]);
  const t = T[locale];
  const done = await confirmEmail(token);
  const cta = user ? { href: "/dashboard", label: t.go } : { href: "/login", label: t.signIn };
  return (
    <AuthCard title={done ? t.ok : t.bad}>
      <p className={`rounded-lg px-3 py-3 text-sm ${done ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`} role="status">
        {done ? t.okSub : t.badSub}
      </p>
      <Link href={cta.href} className="mt-4 block w-full rounded-full bg-ink px-5 py-3 text-center text-sm font-medium text-paper hover:bg-ink-2">{cta.label}</Link>
    </AuthCard>
  );
}
