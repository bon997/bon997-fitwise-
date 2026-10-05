import { steps, testimonials } from "@/lib/marketing-data";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <h2 className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">
        From resume to a tailored application in three steps.
      </h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="border-t border-ink pt-5">
            <span className="text-xs font-semibold tabular-nums text-accent">{s.n}</span>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl sm:text-5xl">Fewer applications. Better ones.</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="flex flex-col justify-between rounded-2xl border border-paper/15 p-6">
              <blockquote className="leading-relaxed text-paper/85">“{t.quote}”</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="block text-paper/55">{t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight sm:text-6xl">
        Your next role is already listed. <em className="text-accent">Find it faster.</em>
      </h2>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/signup">Get your first matches</ButtonLink>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Fitwise</p>
        <ul className="flex gap-6">
          <li><a href="/pricing" className="hover:text-ink">Pricing</a></li>
          <li><a href="/faq" className="hover:text-ink">FAQ</a></li>
          <li><a href="/privacy" className="hover:text-ink">Privacy</a></li>
        </ul>
      </div>
    </footer>
  );
}
