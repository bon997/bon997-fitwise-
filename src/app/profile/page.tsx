import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { num } from "@/lib/data";
import { AppHeader } from "@/components/app/AppHeader";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { DataControls } from "@/components/profile/DataControls";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    meta: "Your profile — Fitwise",
    newTitle: "Let's set you up",
    title: "Your profile",
    newIntro: "Two minutes here makes every match more accurate.",
    intro: "Everything here shapes your fit scores and your \"For you\" ranking.",
    signOut: "Sign out",
  },
  sv: {
    meta: "Din profil — Fitwise",
    newTitle: "Nu sätter vi igång",
    title: "Din profil",
    newIntro: "Två minuter här gör varje matchning mer träffsäker.",
    intro: "Allt här påverkar dina matchningspoäng och din ”För dig”-ranking.",
    signOut: "Logga ut",
  },
});

export async function generateMetadata() {
  return { title: T[await getLocale()].meta };
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
            initial={{
              name: user.name,
              skills: user.skills,
              years_experience: num(user.years_experience),
              seniority: user.seniority,
              preferences: user.preferences ?? {},
            }}
          />
        </div>

        <div className="mt-10">
          <DataControls />
        </div>

        <form action="/api/auth/logout" method="post" className="mt-6 text-center sm:hidden">
          <button className="text-sm text-muted underline underline-offset-2">{t.signOut}</button>
        </form>
      </main>
    </>
  );
}
