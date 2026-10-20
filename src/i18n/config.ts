/** Languages the site speaks. Swedish first: Fitwise is built for the Swedish job market. */
export const LOCALES = ["sv", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "fw_lang";

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/**
 * Pick a language from the Accept-Language header: Swedish (or Norwegian/Danish,
 * who read Swedish easily) gets Swedish, everyone else English.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of prefs) {
    if (lang === "sv" || lang === "nb" || lang === "no" || lang === "nn" || lang === "da") return "sv";
    if (lang === "en") return "en";
  }
  return DEFAULT_LOCALE;
}

/**
 * Co-located translations: `const t = defineT({ en: {...}, sv: {...} })[locale]`.
 * Both languages must have the same keys, so a missing Swedish string is a type error.
 */
export function defineT<T>(dict: { en: T; sv: NoInfer<T> }): Record<Locale, T> {
  return dict;
}

/** Locale-aware number/date helpers. */
export const intlLocale = (l: Locale) => (l === "sv" ? "sv-SE" : "en-GB");
