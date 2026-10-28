import Link from "next/link";
import { after } from "next/server";
import { sql } from "@/lib/db";
import type { UserRow } from "@/lib/data";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const T = defineT({
  en: { dashboard: "Dashboard", jobs: "Jobs", profile: "Profile", admin: "Admin", signOut: "Sign out", signIn: "Sign in", help: "Help and FAQ" },
  sv: { dashboard: "Översikt", jobs: "Jobb", profile: "Profil", admin: "Admin", signOut: "Logga ut", signIn: "Logga in", help: "Hjälp och vanliga frågor" },
});

export async function AppHeader({ user, active }: { user: UserRow | null; active?: string }) {
  const locale = await getLocale();
  const t = T[locale];
  // Emails (job alerts, password resets) follow the language the person uses the site in.
  if (user && user.locale !== locale) after(() => sql("UPDATE users SET locale = $2 WHERE id = $1", [user.id, locale]));
  const nav = [
    { href: "/dashboard", label: t.dashboard, icon: ICONS.dashboard },
    { href: "/jobs", label: t.jobs, icon: ICONS.jobs },
    { href: "/profile", label: t.profile, icon: ICONS.profile },
    ...(user?.role === "admin" ? [{ href: "/admin", label: t.admin, icon: ICONS.admin }] : []),
  ];
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={user ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2 font-display text-xl tracking-tight">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent font-sans text-xs font-semibold text-paper">f</span>
            <span>Fitwise</span>
          </Link>
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {user && (
              <nav aria-label="Main" className="hidden items-center text-sm sm:flex">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active === n.href ? "page" : undefined}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 ${active === n.href ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            )}
            <Link
              href="/faq"
              title={t.help}
              aria-label={t.help}
              aria-current={active === "/faq" ? "page" : undefined}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-sm font-semibold text-ink-2 hover:border-ink/40 hover:text-ink"
            >
              ?
            </Link>
            <LanguageSwitcher className="shrink-0" />
            {user ? (
              <form action="/api/auth/logout" method="post" className="hidden sm:block">
                <button className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink">{t.signOut}</button>
              </form>
            ) : (
              <Link href="/login" className="whitespace-nowrap rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-2">
                {t.signIn}
              </Link>
            )}
          </div>
        </div>
      </header>
      {user && (
        // Phones: the sections move to a bottom tab bar, within thumb reach and never cut off.
        <nav
          id="app-tabbar"
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
        >
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active === n.href ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active === n.href ? "text-accent" : "text-muted hover:text-ink"}`}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active === n.href ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                {n.icon}
              </svg>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  jobs: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  admin: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />,
};
