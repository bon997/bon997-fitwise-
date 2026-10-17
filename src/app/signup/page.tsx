import { AuthPage } from "@/components/auth/AuthPage";

export const metadata = { title: "Create your account — Fitwise" };

export default async function SignupPage(props: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  return <AuthPage {...props} mode="signup" />;
}
