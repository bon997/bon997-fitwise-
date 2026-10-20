import Link from "next/link";
import { one } from "@/lib/db";
import { FAQ, type Faq, type FaqFacts } from "@/lib/faq-data";
import { getLocale } from "@/i18n/server";

/** Facts for the answers; the FAQ still renders if the database is unreachable. */
export async function faqFacts(): Promise<FaqFacts> {
  const row = await one<{ n: number }>("SELECT count(*)::int AS n FROM jobs WHERE is_active").catch(() => null);
  return { activeJobs: row && row.n > 0 ? row.n : null };
}

/** Accordion of questions: one open at a time is not enforced, so readers can compare answers. */
export function FaqList({ items, openFirst = false }: { items: Faq[]; openFirst?: boolean }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map(({ id, q, a }, i) => (
        <details key={id} id={id} open={openFirst && i === 0} className="group scroll-mt-24 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-medium leading-snug tracking-tight hover:text-ink-2 sm:text-2xl [&::-webkit-details-marker]:hidden">
            {q}
            <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="max-w-3xl pb-7 text-base leading-relaxed text-ink-2 sm:text-lg">{a}</div>
        </details>
      ))}
    </div>
  );
}

/** Home page: the seven questions people ask before signing up. */
export async function FaqSection() {
  const locale = await getLocale();
  const items = FAQ[locale](await faqFacts()).slice(0, 7);
  const sv = locale === "sv";
  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <h2 className="font-display text-4xl leading-tight sm:text-5xl">{sv ? "Vanliga frågor" : "Questions, answered"}</h2>
      <div className="mt-8">
        <FaqList items={items} />
      </div>
      <p className="mt-6 text-sm">
        <Link href="/faq" className="text-ink-2 underline underline-offset-2 hover:text-ink">
          {sv ? "Alla frågor och svar →" : "All questions →"}
        </Link>
      </p>
    </section>
  );
}
