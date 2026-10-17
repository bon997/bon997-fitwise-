import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Sections";

/** Layout for marketing and legal pages: site nav, a heading block, and the footer. */
export function PageShell({
  eyebrow,
  title,
  intro,
  children,
  narrow = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <>
      <Navbar />
      <main className={`mx-auto px-4 pb-24 pt-14 sm:px-6 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
        {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl">{title}</h1>
        {intro && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{intro}</div>}
        <div className="mt-12">{children}</div>
      </main>
      <Footer />
    </>
  );
}

/** Readable long-form text for legal pages. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 leading-relaxed text-ink-2 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_table]:w-full [&_td]:border-t [&_td]:border-line [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:text-sm [&_th]:font-medium [&_th]:text-ink [&_ul]:space-y-1.5">
      {children}
    </div>
  );
}
