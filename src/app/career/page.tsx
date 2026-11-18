import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { hasProfile } from "@/lib/matching";
import { can } from "@/lib/plans";
import { isStale } from "@/lib/ai-reports";
import { getCareerPlan, visiblePlan, openJobCounts, planRoles } from "@/lib/career";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { CareerCoach } from "@/components/career/CareerCoach";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Career coach — JobFitwise",
    title: "Career coach",
    lead: "A realistic path from where you are today: the next roles, what they pay, the skills and certifications that get you there, and open jobs for each step.",
    needCv: "Upload your CV first, so your plan starts from your real experience.",
    cvCta: "Go to your profile",
  },
  sv: {
    meta: "Karriärcoach — JobFitwise",
    title: "Karriärcoach",
    lead: "En realistisk väg från där du är i dag: nästa roller, vad de betalar, kompetenserna och certifieringarna som tar dig dit och lediga jobb för varje steg.",
    needCv: "Ladda upp ditt CV först, så att planen utgår från din riktiga erfarenhet.",
    cvCta: "Gå till din profil",
  },
});

export async function generateMetadata(): Promise<Metadata> {
  return { title: T[await getLocale()].meta, robots: { index: false } };
}

export default async function CareerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/career");
  const locale = await getLocale();
  const t = T[locale];
  const profile = hasProfile(user);
  const stored = profile ? await getCareerPlan(user.id) : null;
  const initial = stored
    ? {
        plan: visiblePlan(stored.plan, user),
        target_role: stored.target_role,
        horizon: stored.horizon,
        created_at: new Date(stored.created_at).toISOString(),
        stale: isStale(stored, user.profile_updated_at),
        open_jobs: await openJobCounts(planRoles(stored.plan)),
      }
    : null;
  const prefs = user.preferences ?? {};
  const suggestions = [...new Set([...(prefs.target_titles ?? []), ...(prefs.suggested_roles ?? [])])].slice(0, 10);

  return (
    <>
      <AppHeader user={user} active="/dashboard" />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">{t.title}</h1>
        <p className="mt-2 text-ink-2">{t.lead}</p>
        <div className="mt-8">
          {profile ? (
            <CareerCoach initial={initial} full={can(user, "career_coach")} suggestions={suggestions} />
          ) : (
            <div className="rounded-2xl border border-line bg-white p-6">
              <p>{t.needCv}</p>
              <Link href="/profile" className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90">{t.cvCta}</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
