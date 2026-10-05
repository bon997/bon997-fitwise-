import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getCurrentUser } from "@/lib/auth";

const links = [
  { href: "/jobs", label: "Find jobs" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl tracking-tight">
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
        <div className="flex items-center gap-3">
          {user ? (
            <ButtonLink href="/dashboard" className="!px-4 !py-2">
              Dashboard
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-ink-2 hover:text-ink sm:block">
                Log in
              </Link>
              <ButtonLink href="/signup" className="!px-4 !py-2">
                Get started
              </ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
