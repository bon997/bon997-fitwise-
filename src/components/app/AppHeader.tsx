import Link from "next/link";
import type { UserRow } from "@/lib/data";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/profile", label: "Profile" },
];

export function AppHeader({ user, active }: { user: UserRow | null; active?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-display text-xl tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent font-sans text-xs font-semibold text-paper">f</span>
          Fitwise
        </Link>
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center text-sm">
              {[...NAV, ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active === n.href ? "page" : undefined}
                  className={`rounded-full px-2.5 py-1.5 sm:px-3 ${active === n.href ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <form action="/api/auth/logout" method="post" className="hidden sm:block">
              <button className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-2">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
