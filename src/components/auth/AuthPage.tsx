import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeReturnTo } from "@/lib/google-oauth";
import { EmailAuthForm } from "./EmailAuthForm";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    errors: {
      cancelled: "Sign-in was cancelled. Try again whenever you're ready.",
      invalid_state: "That sign-in link expired. Please try again.",
      not_configured: "Google sign-in isn't set up on this server yet (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
      email_not_verified: "Your Google account's email isn't verified.",
      account_conflict: "This email is already linked to a different Google account.",
    } as Record<string, string>,
    genericError: "Something went wrong signing in. Please try again.",
    signupTitle: "Create your account",
    signinTitle: "Welcome back",
    sub: "Free to use. Your resume stays private.",
    google: "Continue with Google",
    or: "or use your email",
    agree: "By continuing you agree to our",
    terms: "Terms",
    and: "and",
    privacy: "Privacy Policy",
    googleNote: "With Google, we only read your name and email address.",
  },
  sv: {
    errors: {
      cancelled: "Inloggningen avbröts. Försök igen när du är redo.",
      invalid_state: "Inloggningslänken har gått ut. Försök igen.",
      not_configured: "Google-inloggning är inte konfigurerad på servern än (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET saknas).",
      email_not_verified: "E-postadressen på ditt Google-konto är inte verifierad.",
      account_conflict: "Den här e-postadressen är redan kopplad till ett annat Google-konto.",
    },
    genericError: "Något gick fel vid inloggningen. Försök igen.",
    signupTitle: "Skapa ditt konto",
    signinTitle: "Välkommen tillbaka",
    sub: "Gratis att använda. Ditt CV förblir privat.",
    google: "Fortsätt med Google",
    or: "eller använd din e-post",
    agree: "Genom att fortsätta godkänner du våra",
    terms: "villkor",
    and: "och vår",
    privacy: "integritetspolicy",
    googleNote: "Med Google läser vi bara ditt namn och din e-postadress.",
  },
});

type Props = { searchParams: Promise<{ error?: string; returnTo?: string }>; mode?: "signin" | "signup" };

/** Sign-in and sign-up share one page; `mode` picks the starting tab. */
export async function AuthPage({ searchParams, mode = "signin" }: Props) {
  const { error, returnTo } = await searchParams;
  const next = safeReturnTo(returnTo);
  if (await getCurrentUser()) redirect(next);

  const t = T[await getLocale()];
  const message = error ? (t.errors[error] ?? t.genericError) : null;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <Link href="/" className="flex items-center justify-center gap-2 font-display text-3xl tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent font-sans text-sm font-semibold text-paper">f</span>
          Fitwise
        </Link>

        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_-30px_rgba(21,23,28,0.35)] sm:p-8">
          <h1 className="text-center font-display text-3xl">{mode === "signup" ? t.signupTitle : t.signinTitle}</h1>
          <p className="mt-2 text-center text-sm text-ink-2">{t.sub}</p>

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
            {t.google}
          </a>

          <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            {t.or}
            <span className="h-px flex-1 bg-line" />
          </div>

          <EmailAuthForm initialMode={mode} returnTo={next} />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          {t.agree} <Link href="/terms" className="underline underline-offset-2">{t.terms}</Link> {t.and}{" "}
          <Link href="/privacy" className="underline underline-offset-2">{t.privacy}</Link>. {t.googleNote}
        </p>
      </div>
    </main>
  );
}
