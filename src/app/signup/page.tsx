import { AuthPage } from "@/components/auth/AuthPage";

import { getLocale } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getLocale()) === "sv" ? "Skapa konto — Fitwise" : "Create your account — Fitwise" };
}

export default async function SignupPage(props: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  return <AuthPage {...props} mode="signup" />;
}
