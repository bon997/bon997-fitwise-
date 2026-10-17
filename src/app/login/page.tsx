import { AuthPage } from "@/components/auth/AuthPage";

export const metadata = { title: "Sign in — Fitwise" };

export default async function LoginPage(props: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  return <AuthPage {...props} mode="signin" />;
}
