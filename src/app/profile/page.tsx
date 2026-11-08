import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { num } from "@/lib/data";
import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/landing/Sections";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { PrioritiesEditor } from "@/components/profile/PrioritiesEditor";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { DataControls } from "@/components/profile/DataControls";
import { AlertSettings } from "@/components/profile/AlertSettings";
import { alertSettingsFor } from "@/lib/alert-settings";
import { hasProfile } from "@/lib/matching";
import { can } from "@/lib/plans";
import { emailConfigured } from "@/lib/email";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Your profile — JobFitwise",
    newTitle: "Let's set you up",
    title: "Your profile",
    newIntro: "Two minutes here makes every match more accurate.",
    intro: "Everything here shapes your fit scores and your \"For you\" ranking.",
    signOut: "Sign out",
    retake: "Answer the quick questions again",
    plan: "Your plan and billing",
  },
  sv: {
    meta: "Din profil — JobFitwise",
    newTitle: "Nu sätter vi igång",
    title: "Din profil",
    newIntro: "Två minuter här gör varje matchning mer träffsäker.",
    intro: "Allt här påverkar dina matchningspoäng och din ”För dig”-ranking.",
    signOut: "Logga ut",
    retake: "Svara på snabbfrågorna igen",
    plan: "Din plan och betalning",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
}

/** The Google Drive button appears only once its three settings exist in Vercel. */
function driveConfig() {
  const apiKey = process.env.GOOGLE_PICKER_API_KEY?.trim();
  const appId = process.env.GOOGLE_PROJECT_NUMBER?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return apiKey && appId && clientId ? { apiKey, appId, clientId } : null;
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/profile");
  const isNew = user.skills.length === 0;
  const t = T[await getLocale()];

  return (
    <>
      <AppHeader user={user} active="/profile" />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">{isNew ? t.newTitle : t.title}</h1>
            <p className="mt-2 text-ink-2">
              {isNew ? t.newIntro : t.intro}
            </p>
            <a href="/onboarding" className="mt-2 inline-block text-sm text-accent underline underline-offset-2">{t.retake}</a>
            <span className="mx-2 text-muted" aria-hidden>·</span>
            <Link href="/account" className="mt-2 inline-block text-sm text-accent underline underline-offset-2">{t.plan}</Link>
          </div>
          {user.resume_score != null && (
            <div className="shrink-0 text-center">
              <FitScoreRing score={user.resume_score} size={72} label="/ 100" />
            </div>
          )}
        </div>

        <div className="mt-8">
          <ProfileForm
            hasResume={Boolean(user.resume_text)}
            drive={driveConfig()}
            initial={{
              name: user.name,
              skills: user.skills,
              years_experience: num(user.years_experience),
              seniority: user.seniority,
              education: user.education ?? [],
              preferences: user.preferences ?? {},
            }}
          />
        </div>

        <div className="mt-10">
          <PrioritiesEditor initial={user.preferences?.priorities ?? []} locked={!can(user, "advanced_filters")} />
        </div>

        <div className="mt-10">
          <AlertSettings
            initial={user.job_alerts}
            settings={alertSettingsFor(user.preferences)}
            email={user.email}
            verified={Boolean(user.email_verified_at)}
            emailOn={emailConfigured()}
            hasProfile={hasProfile(user)}
            locked={!can(user, "job_alerts")}
          />
        </div>

        <div className="mt-6">
          <DataControls />
        </div>

        <form action="/api/auth/logout" method="post" className="mt-6 text-center sm:hidden">
          <button className="text-sm text-muted underline underline-offset-2">{t.signOut}</button>
        </form>
      </main>
      <Footer />
    </>
  );
}
