import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { MARKETING } from "@/lib/marketing-data";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: { example: "Example", match: "You match", build: "Worth building", posted: "Posted", apply: "Apply with AI →", fit: "fit" },
  sv: { example: "Exempel", match: "Du har", build: "Värt att utveckla", posted: "Publicerad", apply: "Sök med AI →", fit: "match" },
});

/** Illustrative scored job card in the hero, labelled "Example" so it is not read as a real listing. */
export async function JobCardPreview() {
  const locale = await getLocale();
  const t = T[locale];
  const job = MARKETING[locale].exampleJob;
  return (
    <div className="relative">
      {/* back card for depth */}
      <div className="absolute inset-x-6 -bottom-3 h-full rounded-2xl border border-line bg-paper-2" aria-hidden />
      <article className="relative rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_-24px_rgba(21,23,28,0.35)] sm:p-6">
        <span className="absolute -top-3 left-5 rounded-full border border-line bg-paper px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
          {t.example}
        </span>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{job.company}</p>
            <h3 className="mt-1 text-lg font-semibold leading-snug">{job.title}</h3>
            <p className="mt-1 text-sm text-ink-2">
              {job.location} · {job.salary}
            </p>
          </div>
          <FitScoreRing score={job.score} label={t.fit} />
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs font-medium text-muted">{t.match}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {job.matched.map((s) => (
              <li key={s} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                ✓ {s}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-medium text-muted">{t.build}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {job.missing.map((s) => (
              <li key={s} className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn">
                + {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{t.posted} {job.posted}</span>
          <span className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper">{t.apply}</span>
        </div>
      </article>
    </div>
  );
}
