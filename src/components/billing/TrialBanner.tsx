import Link from "next/link";
import { trialDaysLeft, trialJustEnded } from "@/lib/plans";
import { defineT, type Locale } from "@/i18n/config";
import type { UserRow } from "@/lib/data";

const T = defineT({
  en: {
    running: (n: number) => `Pro trial: ${n === 1 ? "1 day" : `${n} days`} left.`,
    runningBody: "Every Pro feature is free until then. Afterwards you go back to Basic by itself: no card, nothing is charged.",
    keep: "Keep Pro →",
    ended: "Your free Pro trial has ended.",
    endedBody: "Your saved jobs, applications and profile are all still here.",
    plans: "See plans →",
  },
  sv: {
    running: (n: number) => `Pro-provperiod: ${n === 1 ? "1 dag" : `${n} dagar`} kvar.`,
    runningBody: "Alla Pro-funktioner är gratis tills dess. Sedan går du automatiskt tillbaka till Basic: inget kort, inget dras.",
    keep: "Behåll Pro →",
    ended: "Din gratis Pro-provperiod har tagit slut.",
    endedBody: "Dina sparade jobb, ansökningar och din profil finns kvar.",
    plans: "Se planer →",
  },
});

/** "Pro trial: 5 days left" while a trial runs, "Your trial has ended" for two weeks after. */
export function TrialBanner({ user, locale }: { user: UserRow; locale: Locale }) {
  const t = T[locale];
  const left = trialDaysLeft(user);
  if (left == null && !trialJustEnded(user)) return null;
  return (
    <p className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 text-sm ${left != null ? "border border-accent/30 bg-accent-soft/60" : "border border-line bg-white"}`}>
      <strong className="font-semibold">{left != null ? t.running(left) : t.ended}</strong>
      <span className="text-ink-2">{left != null ? t.runningBody : t.endedBody}</span>
      <Link href="/pricing?period=quarter" className="font-medium text-accent hover:underline">{left != null ? t.keep : t.plans}</Link>
    </p>
  );
}
