import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { num } from "@/lib/data";
import { AppHeader } from "@/components/app/AppHeader";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { DataControls } from "@/components/profile/DataControls";

export const metadata = { title: "Your profile — Fitwise" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/profile");
  const isNew = user.skills.length === 0;

  return (
    <>
      <AppHeader user={user} active="/profile" />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">{isNew ? "Let's set you up" : "Your profile"}</h1>
            <p className="mt-2 text-ink-2">
              {isNew
                ? "Two minutes here makes every match more accurate."
                : "Everything here shapes your fit scores and your \"For you\" ranking."}
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
          <button className="text-sm text-muted underline underline-offset-2">Sign out</button>
        </form>
      </main>
    </>
  );
}
