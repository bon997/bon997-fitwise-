"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

const LABEL: Record<Locale, { short: string; name: string }> = {
  sv: { short: "SV", name: "Svenska" },
  en: { short: "EN", name: "English" },
};

/** SV | EN toggle. Remembers the choice for a year and re-renders the page in place. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  const choose = (l: Locale) => {
    if (l === current) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = l;
    start(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label={current === "sv" ? "Språk" : "Language"}
      className={`inline-flex items-center rounded-full border border-line p-0.5 text-xs ${pending ? "opacity-60" : ""} ${className}`}
    >
      {(Object.keys(LABEL) as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={current === l}
          title={LABEL[l].name}
          onClick={() => choose(l)}
          className={`rounded-full px-2 py-1 font-medium transition-colors ${current === l ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {LABEL[l].short}
        </button>
      ))}
    </div>
  );
}
