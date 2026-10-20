import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: { jobs: "Find jobs", how: "How it works", pricing: "Pricing", faq: "FAQ", dashboard: "Dashboard", login: "Log in", start: "Get started" },
  sv: { jobs: "Hitta jobb", how: "Så fungerar det", pricing: "Priser", faq: "Vanliga frågor", dashboard: "Översikt", login: "Logga in", start: "Kom igång" },
});

export async function Navbar() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = T[locale];
  const links = [
    { href: "/jobs", label: t.jobs },
    { href: "/#how", label: t.how },
    { href: "/pricing", label: t.pricing },
    { href: "/faq", label: t.faq },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-2xl tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-sm font-sans font-semibold text-paper">
            f
          </span>
          Fitwise
        </Link>
        <ul className="hidden items-center gap-8 text-sm text-ink-2 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          {user ? (
            <ButtonLink href="/dashboard" className="!px-4 !py-2">
              {t.dashboard}
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-ink-2 hover:text-ink sm:block">
                {t.login}
              </Link>
              <ButtonLink href="/signup" className="!px-4 !py-2">
                {t.start}
              </ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
