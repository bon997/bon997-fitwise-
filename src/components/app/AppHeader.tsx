import Link from "next/link";
import type { UserRow } from "@/lib/data";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const T = defineT({
  en: { dashboard: "Dashboard", jobs: "Jobs", profile: "Profile", admin: "Admin", signOut: "Sign out", signIn: "Sign in", help: "Help and FAQ" },
  sv: { dashboard: "Översikt", jobs: "Jobb", profile: "Profil", admin: "Admin", signOut: "Logga ut", signIn: "Logga in", help: "Hjälp och vanliga frågor" },
});

export async function AppHeader({ user, active }: { user: UserRow | null; active?: string }) {
  const t = T[await getLocale()];
  const nav = [
    { href: "/dashboard", label: t.dashboard },
    { href: "/jobs", label: t.jobs },
    { href: "/profile", label: t.profile },
    ...(user?.role === "admin" ? [{ href: "/admin", label: t.admin }] : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2 font-display text-xl tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent font-sans text-xs font-semibold text-paper">f</span>
          <span className="hidden min-[400px]:inline">Fitwise</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {user && (
            <nav className="flex items-center overflow-x-auto text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active === n.href ? "page" : undefined}
                  className={`whitespace-nowrap rounded-full px-2.5 py-1.5 sm:px-3 ${active === n.href ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
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
  );
}
