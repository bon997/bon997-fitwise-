import Link from "next/link";
import { FitScoreRing } from "@/components/ui/FitScoreRing";
import { defineT, type Locale } from "@/i18n/config";
import type { ChecklistItem } from "@/lib/next-action";
import { stepText } from "./NextAction";

const T = defineT({
  en: { title: "Profile strength", done: "All set — your profile is complete.", edit: "Edit profile", left: (n: number) => `${n} more ${n === 1 ? "step" : "steps"}` },
  sv: { title: "Profilstyrka", done: "Klart — din profil är komplett.", edit: "Redigera profil", left: (n: number) => `${n} steg kvar` },
});

/** Profile strength with the open steps, biggest gain first — each "+N" is real points. */
export function ProfileStrength({ strength, checklist, locale }: { strength: number; checklist: ChecklistItem[]; locale: Locale }) {
  const t = T[locale];
  const open = checklist.filter((i) => !i.done).sort((a, b) => b.gain - a.gain);
  return (
    <section aria-labelledby="strength-heading" className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center gap-4">
        <FitScoreRing score={strength} size={64} label="/ 100" />
        <div>
          <h2 id="strength-heading" className="text-lg font-semibold">{t.title}</h2>
          <p className="text-xs text-muted">{open.length === 0 ? t.done : t.left(open.length)}</p>
        </div>
      </div>
      {open.length > 0 && (
        <ul className="mt-4 space-y-2">
          {open.slice(0, 4).map((i) => (
            <li key={i.key} className="flex items-start justify-between gap-3 text-sm">
              <span className="flex items-start gap-2 text-ink-2">
                <span aria-hidden className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full border-2 border-line" />
                {stepText(i, locale)}
              </span>
              {i.gain > 0 && <span className="shrink-0 text-xs font-semibold tabular-nums text-accent">+{i.gain}</span>}
            </li>
          ))}
        </ul>
      )}
      <Link href="/profile" className="mt-4 inline-block text-sm font-medium text-accent underline underline-offset-2">{t.edit}</Link>
    </section>
  );
}
