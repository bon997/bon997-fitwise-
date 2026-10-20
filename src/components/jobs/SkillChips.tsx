import { skillLabel } from "@/lib/format";
import { getLocale } from "@/i18n/server";

type Props = { matched?: string[]; partial?: string[]; missing?: string[]; max?: number };

/** Green = you have it, outlined = related skill (partial credit), amber = missing. */
export async function SkillChips({ matched = [], partial = [], missing = [], max = 99 }: Props) {
  const sv = (await getLocale()) === "sv";
  const items = [
    ...matched.map((s) => ({ s, kind: "m" as const })),
    ...partial.map((s) => ({ s, kind: "p" as const })),
    ...missing.map((s) => ({ s, kind: "x" as const })),
  ];
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map(({ s, kind }) => (
        <li
          key={kind + s}
          className={
            kind === "m"
              ? "rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
              : kind === "p"
                ? "rounded-full border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent"
                : "rounded-full bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn"
          }
          title={kind === "m" ? (sv ? "Du har den här" : "You have this") : kind === "p" ? (sv ? "Du har en närliggande kompetens" : "You have a related skill") : sv ? "Saknas" : "Missing"}
        >
          {kind === "m" ? "✓ " : kind === "p" ? "≈ " : "+ "}
          {skillLabel(s)}
        </li>
      ))}
      {more > 0 && <li className="px-1 py-1 text-xs text-muted">+{more} {sv ? "till" : "more"}</li>}
    </ul>
  );
}
