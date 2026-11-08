"use client";

import { useLocale } from "@/i18n/client";
import { suggestSpelling } from "@/lib/job-terms";

/** "Did you mean logistics?" under a search box; clicking the suggestion fills it in. */
export function SpellingHint({ value, words, onPick }: { value: string; words?: readonly string[]; onPick: (v: string) => void }) {
  const sv = useLocale() === "sv";
  const fix = suggestSpelling(value, words);
  if (!fix) return null;
  return (
    <p className="mt-1 text-xs text-warn" role="status">
      {sv ? "Menade du " : "Did you mean "}
      <button type="button" onClick={() => onPick(fix)} className="font-semibold underline underline-offset-2 hover:text-ink">
        {fix}
      </button>
      ?
    </p>
  );
}
