import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { LogoMark } from "@/components/brand/LogoMark";

/** The centred logo-and-card frame shared by the sign-in and password pages. */
export function AuthCard({ title, sub, children, footer }: { title: string; sub?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <Link href="/" className="flex items-center justify-center gap-2 font-display text-3xl tracking-tight">
          <LogoMark size={32} />
          JobFitwise
        </Link>
        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_-30px_rgba(21,23,28,0.35)] sm:p-8">
          <h1 className="text-center font-display text-3xl">{title}</h1>
          {sub && <p className="mt-2 text-center text-sm text-ink-2">{sub}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </main>
  );
}
