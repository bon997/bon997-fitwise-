import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Job alerts — Fitwise",
    title: "Turn off job alerts?",
    sub: "You'll stop getting the weekly email with new jobs that fit you. Your account stays as it is.",
    button: "Turn off job alerts",
    done: "Job alerts are off",
    doneSub: "You won't get any more job alert emails. You can turn them back on any time on your profile.",
    bad: "This link doesn't work",
    badSub: "It may be from an old email. Sign in and change job alerts on your profile instead.",
    profile: "Go to my profile",
    home: "Back to Fitwise",
  },
  sv: {
    meta: "Jobbtips — Fitwise",
    title: "Stänga av jobbtips?",
    sub: "Du slutar få veckomejlet med nya jobb som passar dig. Ditt konto påverkas inte.",
    button: "Stäng av jobbtips",
    done: "Jobbtips är avstängt",
    doneSub: "Du får inga fler mejl med jobbtips. Du kan slå på dem igen när du vill på din profil.",
    bad: "Länken fungerar inte",
    badSub: "Den kan komma från ett gammalt mejl. Logga in och ändra jobbtips på din profil i stället.",
    profile: "Till min profil",
    home: "Tillbaka till Fitwise",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta, referrer: "no-referrer" as const, robots: { index: false } };
}

type SP = Promise<{ t?: string; done?: string; bad?: string }>;

export default async function UnsubscribePage({ searchParams }: { searchParams: SP }) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = T[locale];
  const token = sp.t ?? "";
  const link = "mt-4 block w-full rounded-full border border-ink/20 px-5 py-3 text-center text-sm font-medium hover:border-ink/50";

  if (sp.done || sp.bad || !/^[0-9a-f]{20,64}$/.test(token)) {
    const ok = Boolean(sp.done);
    return (
      <AuthCard title={ok ? t.done : t.bad}>
        <p role="status" className={`rounded-lg px-3 py-3 text-sm ${ok ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>{ok ? t.doneSub : t.badSub}</p>
        <Link href="/profile" className={link}>{t.profile}</Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t.title} sub={t.sub}>
      <form method="post" action={`/api/alerts/unsubscribe?t=${encodeURIComponent(token)}&from=page`}>
        <button className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink-2">{t.button}</button>
      </form>
      <Link href="/" className={link}>{t.home}</Link>
    </AuthCard>
  );
}
