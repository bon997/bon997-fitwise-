import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { SkillChips } from "@/components/jobs/SkillChips";
import { LockedTeaser } from "@/components/billing/Upgrade";
import { defineT, type Locale } from "@/i18n/config";
import { labels, skillLabel } from "@/lib/format";
import { WEIGHTS, partPoints, type FitBreakdown } from "@/lib/ai/fit-score";

const T = defineT({
  en: {
    fit: "fit",
    notInAd: "not in the ad",
    mustHave: "Missing must-have:",
    win: (skill: string, from: number, to: number) => `Biggest win: add ${skill} → ${from} to ${to}`,
    scaled: "Parts the ad doesn't mention are left out and the rest scaled up.",
    capped: "Capped because a must-have skill is missing.",
    oldScore: "Recalculating with the new formula — reload in a moment.",
    lockTitle: "Full match breakdown",
    lockBody: "See your ATS-style score split into skills, experience, education and location, the must-haves you're missing, and the one skill that would raise it most.",
  },
  sv: {
    fit: "match",
    notInAd: "nämns inte",
    mustHave: "Saknat krav:",
    win: (skill: string, from: number, to: number) => `Störst effekt: lägg till ${skill} → ${from} till ${to}`,
    scaled: "Delar som annonsen inte nämner räknas bort och resten skalas upp.",
    capped: "Begränsad eftersom en krav-kompetens saknas.",
    oldScore: "Räknas om med den nya formeln — ladda om om en stund.",
    lockTitle: "Hela matchningsanalysen",
    lockBody: "Se din ATS-poäng uppdelad på kompetenser, erfarenhet, utbildning och ort, vilka krav du saknar och vilken kompetens som höjer poängen mest.",
  },
});

const PARTS = Object.keys(WEIGHTS) as (keyof FitBreakdown)[];

const READY_STYLE = {
  ready: "bg-accent text-paper",
  almost: "bg-warn-soft text-warn",
  stretch: "bg-paper-2 text-ink-2",
} as const;

/**
 * The job page's "Your fit" body: score, readiness, confidence, the four parts
 * as points out of their weight, skill chips, missing must-haves and the one
 * skill that would raise this score the most.
 */
export function FitDetails({
  score, breakdown, matched, partial, missing, improvement, locale, full = true,
}: {
  /** false on Basic: the score and readiness only; the breakdown is a Pro feature. */
  full?: boolean;
  score: number;
  breakdown: Record<string, unknown>;
  matched: string[];
  partial: string[];
  missing: string[];
  improvement: { skill: string; from: number; to: number } | null;
  locale: Locale;
}) {
  const t = T[locale];
  const L = labels(locale);
  const readiness = breakdown.readiness as keyof typeof READY_STYLE | undefined;
  const confidence = breakdown.confidence as string | undefined;
  const missingRequired = (breakdown.missing_required as string[] | undefined) ?? [];
  const part = (k: keyof FitBreakdown) => (typeof breakdown[k] === "number" ? (breakdown[k] as number) : null);
  const leftOut = PARTS.some((k) => part(k) == null);

  // Scores stored before the new formula have none of the new fields; they recompute on the next view.
  if (!readiness) return <p className="mt-2 text-sm text-ink-2">{t.oldScore}</p>;

  return (
    <>
      <div className="mt-4 flex items-center gap-5">
        <FitScoreRing score={score} size={88} stroke={8} label={t.fit} />
        <div className="min-w-0">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${READY_STYLE[readiness]}`}>
            {L.readiness[readiness]}
          </span>
          {confidence && <p className="mt-1.5 text-xs text-muted">{L.confidence[confidence]}</p>}
        </div>
      </div>

      {!full ? (
        <div className="mt-5 space-y-4">
          <SkillChips matched={matched} partial={[]} missing={[]} />
          <LockedTeaser plan="pro" title={t.lockTitle} body={t.lockBody} />
        </div>
      ) : (<>
      <dl className="mt-5 space-y-2">
        {PARTS.map((k) => {
          const v = part(k);
          const pts = partPoints(k, v);
          return (
            <div key={k} className="grid grid-cols-[104px_1fr_auto] items-center gap-2 text-xs">
              <dt className="text-muted">{L.breakdown[k]}</dt>
              <dd className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                {v != null && <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />}
              </dd>
              <dd className="text-right tabular-nums text-ink-2">
                {pts == null ? <span className="text-muted">{t.notInAd}</span> : <>{pts}<span className="text-muted">/{WEIGHTS[k]}</span></>}
              </dd>
            </div>
          );
        })}
      </dl>
      {(leftOut || missingRequired.length > 0) && (
        <p className="mt-2 text-[11px] leading-snug text-muted">
          {leftOut && t.scaled} {missingRequired.length > 0 && t.capped}
        </p>
      )}

      <div className="mt-5">
        <SkillChips matched={matched} partial={partial} missing={missing} />
      </div>

      {missingRequired.length > 0 && (
        <p className="mt-3 text-sm text-warn">
          <span aria-hidden>⚠ </span>{t.mustHave} {missingRequired.map(skillLabel).join(", ")}
        </p>
      )}
      {improvement && (
        <p className="mt-2 text-sm font-medium text-accent">
          <span aria-hidden>↗ </span>{t.win(skillLabel(improvement.skill), improvement.from, improvement.to)}
        </p>
      )}
      </>)}
    </>
  );
}
