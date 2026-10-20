import { MARKETING } from "@/lib/marketing-data";
import { getLocale } from "@/i18n/server";

export async function LogoStrip() {
  const { promises } = MARKETING[await getLocale()];
  return (
    <section className="border-y border-line bg-paper-2/60">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 text-sm text-ink-2 sm:px-6">
        {promises.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <span className="text-accent" aria-hidden>✓</span>
            {p}
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function Stats() {
  const { stats } = MARKETING[await getLocale()];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper p-6 sm:p-8">
            <dt className="min-h-10 text-sm text-muted">{s.label}</dt>
            <dd className="mt-2 font-display text-4xl tabular-nums sm:text-5xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
