import { companies, stats } from "@/lib/marketing-data";

export function LogoStrip() {
  return (
    <section className="border-y border-line bg-paper-2/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center text-xs uppercase tracking-[0.18em] text-muted">
          Members have been hired at
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {companies.map((c) => (
            <li key={c} className="font-display text-2xl text-ink/45">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Stats() {
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
