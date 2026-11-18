import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { ManageButton } from "@/components/billing/ManageButton";
import { PlanButton } from "@/components/billing/PlanButton";
import { PRICE_SEK, currentPlan, paywallEnabled } from "@/lib/plans";
import { getLocale } from "@/i18n/server";
import { defineT, intlLocale } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Your plan — JobFitwise",
    title: "Your plan",
    welcome: "Welcome to your new plan! It can take a few seconds to show here; reload if it still says Basic.",
    beta: "JobFitwise is free during beta, so every feature is unlocked for you right now. Plans start later.",
    plan: { basic: "Basic (free)", pro: "Pro", premium: "Premium" },
    renews: (d: string) => `Renews on ${d}`,
    ends: (d: string) => `Ends on ${d}; you keep it until then`,
    pastDue: "Your last payment didn't go through. Update your card to keep your plan.",
    manual: "Granted by JobFitwise",
    manage: "Manage subscription, card and receipts",
    failed: "Couldn't open the billing page. Try again in a moment.",
    upgradePro: `Upgrade to Pro — ${PRICE_SEK.pro} kr/month`,
    upgradePremium: `Upgrade to Premium — ${PRICE_SEK.premium} kr/month`,
    compare: "Compare plans",
    checkoutFailed: "Couldn't open checkout. Try again in a moment.",
  },
  sv: {
    meta: "Din plan — JobFitwise",
    title: "Din plan",
    welcome: "Välkommen till din nya plan! Det kan ta några sekunder innan den syns här; ladda om om det fortfarande står Basic.",
    beta: "JobFitwise är gratis under betan, så alla funktioner är upplåsta för dig just nu. Planerna startar senare.",
    plan: { basic: "Basic (gratis)", pro: "Pro", premium: "Premium" },
    renews: (d: string) => `Förnyas ${d}`,
    ends: (d: string) => `Avslutas ${d}; du behåller den till dess`,
    pastDue: "Din senaste betalning gick inte igenom. Uppdatera ditt kort för att behålla planen.",
    manual: "Tilldelad av JobFitwise",
    manage: "Hantera prenumeration, kort och kvitton",
    failed: "Kunde inte öppna betalsidan. Försök igen om en stund.",
    upgradePro: `Uppgradera till Pro — ${PRICE_SEK.pro} kr/mån`,
    upgradePremium: `Uppgradera till Premium — ${PRICE_SEK.premium} kr/mån`,
    compare: "Jämför planer",
    checkoutFailed: "Kunde inte öppna betalningen. Försök igen om en stund.",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [user, locale, sp] = await Promise.all([getCurrentUser(), getLocale(), searchParams]);
  if (!user) redirect("/login?returnTo=/account");
  const t = T[locale];
  const live = paywallEnabled();
  const plan = currentPlan(user);
  const date = (d: Date) => new Date(d).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" });
  const cancelling = user.plan_status === "canceled" && user.plan_period_end;
  const btn = "block w-full rounded-full px-5 py-3 text-center text-sm font-medium sm:w-auto";

  return (
    <>
      <AppHeader user={user} active="/profile" />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-display text-4xl">{t.title}</h1>
        {sp.checkout === "success" && <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">{t.welcome}</p>}

        <section className="mt-6 rounded-2xl border border-line bg-white p-6">
          <p className="font-display text-3xl">{live ? t.plan[plan] : "Premium"}</p>
          {!live && <p className="mt-2 text-sm text-ink-2">{t.beta}</p>}
          {live && user.plan_status === "manual" && <p className="mt-1 text-sm text-muted">{t.manual}</p>}
          {live && user.plan_status === "past_due" && <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{t.pastDue}</p>}
          {live && plan !== "basic" && user.plan_period_end && user.plan_status !== "manual" && (
            <p className="mt-1 text-sm text-muted">{cancelling ? t.ends(date(user.plan_period_end)) : t.renews(date(user.plan_period_end))}</p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {live && user.stripe_customer_id && <ManageButton label={t.manage} failedText={t.failed} />}
            {live && plan === "basic" && (
              <PlanButton plan="pro" label={t.upgradePro} signedIn failedText={t.checkoutFailed} className={`${btn} bg-accent text-paper hover:opacity-90`} />
            )}
            {live && plan !== "premium" && (
              <PlanButton plan="premium" label={t.upgradePremium} signedIn failedText={t.checkoutFailed} className={`${btn} border border-ink/20 hover:border-ink/50`} />
            )}
            <Link href="/pricing" className={`${btn} text-accent underline underline-offset-2`}>{t.compare}</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
