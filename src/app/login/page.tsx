import { AuthPage } from "@/components/auth/AuthPage";

import { getLocale } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getLocale()) === "sv" ? "Logga in — JobFitwise" : "Sign in — JobFitwise" };
}

export default async function LoginPage(props: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  return <AuthPage {...props} mode="signin" />;
}
