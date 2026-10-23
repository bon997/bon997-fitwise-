import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getLocale } from "@/i18n/server";
import { OnboardingFlow, type OnboardingInitial } from "@/components/onboarding/OnboardingFlow";

export async function generateMetadata() {
  return { title: (await getLocale()) === "sv" ? "Kom igång — Fitwise" : "Get started — Fitwise" };
}

/** Same rule as the profile page: the Drive button appears once its settings exist. */
function driveConfig() {
  const apiKey = process.env.GOOGLE_PICKER_API_KEY?.trim();
  const appId = process.env.GOOGLE_PROJECT_NUMBER?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return apiKey && appId && clientId ? { apiKey, appId, clientId } : null;
}

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/onboarding");

  // Towns with the most open jobs right now, offered as one-tap choices.
  const towns = await sql<{ town: string }>(
    `SELECT trim(split_part(location, ',', 1)) AS town FROM jobs
     WHERE is_active AND location IS NOT NULL AND trim(split_part(location, ',', 1)) <> ''
     GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 40`,
  ).catch(() => []);

  const p = user.preferences ?? {};
  const initial: OnboardingInitial = {
    status: p.search_status ?? null,
    titles: (p.target_titles ?? []).slice(0, 5),
    seniority: user.seniority,
    jobTypes: p.job_types ?? [],
    mode: p.work_mode ?? null,
    locations: p.locations ?? [],
    salaryMinYear: p.salary_min ?? null,
  };

  return <OnboardingFlow initial={initial} towns={towns.map((t) => t.town)} drive={driveConfig()} />;
}
