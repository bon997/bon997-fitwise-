import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeReturnTo } from "@/lib/google-oauth";

const ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Try again whenever you're ready.",
  invalid_state: "That sign-in link expired. Please try again.",
  not_configured: "Google sign-in isn't set up on this server yet (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
  email_not_verified: "Your Google account's email isn't verified.",
  account_conflict: "This email is already linked to a different Google account.",
};

type Props = { searchParams: Promise<{ error?: string; returnTo?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error, returnTo } = await searchParams;
  const next = safeReturnTo(returnTo);
  if (await getCurrentUser()) redirect(next);

  const message = error ? (ERRORS[error] ?? "Something went wrong signing in. Please try again.") : null;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 font-display text-3xl tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent font-sans text-sm font-semibold text-paper">f</span>
          Fitwise
        </Link>

        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_-30px_rgba(21,23,28,0.35)] sm:p-8">
          <h1 className="text-center font-display text-3xl">Welcome</h1>
          <p className="mt-2 text-center text-sm text-ink-2">Sign in or create your account. It&apos;s free.</p>

          {message && (
            <p role="alert" className="mt-6 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
              {message}
            </p>
          )}

          {/* A plain link, not a form: the route handler redirects to Google. */}
          <a
            href={`/api/auth/google?returnTo=${encodeURIComponent(next)}`}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-ink/20 bg-white px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-ink/50 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            Continue with Google
          </a>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            We only read your name and email address. Email-and-password sign-in is coming soon.
          </p>
        </div>
      </div>
    </main>
  );
}
