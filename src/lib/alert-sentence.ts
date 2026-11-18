/**
 * Plain-language alert setup: "Send me 5 logistics jobs in Gothenburg every day",
 * "procurement jobs weekly", "tio inköpsjobb i Mölndal varje månad, minst 80 % matchning".
 * A small rule-based reader (English and Swedish): instant, free and predictable, no AI call.
 * It only fills in what the sentence says; everything else keeps its current value.
 */
import {
  CATEGORIES, CATEGORY_LABEL, CATEGORY_TERMS, CITY_CENTRE, COUNTS, MIN_MATCHES, RADII,
  distanceKm, findTown, type AlertSettings, type Category, type City,
} from "./alert-settings";

export type SentenceResult = {
  settings: Partial<AlertSettings>;
  /** Which settings the sentence set, in form order. */
  understood: (keyof AlertSettings)[];
  /** A town we know but that is too far from every alert city, so the area became all of Sweden. */
  farTown?: string;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20,
  en: 1, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9, tio: 10, femton: 15, tjugo: 20,
};

const nearest = <T extends number>(xs: readonly T[], n: number): T =>
  xs.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), xs[0]);
const atLeast = <T extends number>(xs: readonly T[], n: number): T | null => xs.find((x) => x >= n) ?? null;

/** Extra everyday words per category, on top of the job-title terms alerts match on. */
const CATEGORY_WORDS: Record<Category, string[]> = {
  logistics: ["logistic", "logistik"],
  supply_chain: ["supply chain", "supply planner", "supply planning", "planner", "planering", "planerare"],
  warehouse: ["warehouse", "lager"],
  transport: ["transport", "trafik"],
  procurement: ["procurement", "upphandling"],
  purchasing: ["purchasing", "purchase", "inköp", "buyer"],
  operations: ["operations", "drift"],
  manufacturing: ["manufacturing", "production", "produktion", "tillverkning"],
};

function categoriesIn(text: string): Category[] {
  return CATEGORIES.filter((c) =>
    [...CATEGORY_WORDS[c], ...CATEGORY_TERMS[c]].some((w) => w.length >= 3 && text.includes(w.toLowerCase())),
  );
}

export function parseAlertSentence(input: string): SentenceResult {
  const text = ` ${input.toLowerCase().replace(/\s+/g, " ").trim()} `;
  const settings: Partial<AlertSettings> = {};
  const understood: (keyof AlertSettings)[] = [];
  const set = <K extends keyof AlertSettings>(k: K, v: AlertSettings[K]) => { settings[k] = v; if (!understood.includes(k)) understood.push(k); };

  // How often
  if (/\b(daily|every ?day|each day|per day|a day)\b|dagligen|varje dag|per dag|om dagen|\bdagliga\b/.test(text)) set("frequency", "daily");
  else if (/\b(weekly|every ?week|each week|per week|a week)\b|veckovis|varje vecka|per vecka|i veckan/.test(text)) set("frequency", "weekly");
  else if (/\b(monthly|every ?month|each month|per month|a month)\b|månadsvis|varje månad|per månad|i månaden/.test(text)) set("frequency", "monthly");

  // Minimum match: "at least 80%", "minst 70 %", "80% match"
  const pct = text.match(/(\d{2,3})\s?%/);
  if (pct) set("min_match", nearest(MIN_MATCHES, Number(pct[1])));
  const withoutPct = pct ? text.replace(pct[0], " ") : text;

  // Radius: "within 50 km", "inom 100 km"
  const km = withoutPct.match(/(\d{1,3})\s?km\b/);
  if (km) set("radius_km", atLeast(RADII, Number(km[1])) ?? RADII[RADII.length - 1]);
  const rest = km ? withoutPct.replace(km[0], " ") : withoutPct;

  // How many: the first number (digits or a word) left in the sentence
  const n = rest.match(/\b(\d{1,2})\b/)?.[1] ?? Object.keys(NUMBER_WORDS).find((w) => new RegExp(`\\s${w}\\s`).test(rest));
  if (n) set("count", nearest(COUNTS, Number(n) || NUMBER_WORDS[n]));

  // What
  const cats = categoriesIn(text);
  if (cats.length) set("categories", cats);

  // Where: anywhere, or the alert city nearest the town named, with a radius that reaches it
  if (/anywhere|all of sweden|whole (of )?sweden|hela sverige|var som helst|överallt|remote|distans/.test(text)) {
    set("city", "sweden");
  } else {
    const town = findTown(text);
    if (town) {
      let best: { city: City; km: number } | null = null;
      for (const [city, at] of Object.entries(CITY_CENTRE) as [Exclude<City, "sweden">, [number, number]][]) {
        const d = distanceKm(at, town.at);
        if (!best || d < best.km) best = { city, km: d };
      }
      const reach = best ? atLeast(RADII, Math.ceil(best.km) + 5) : null;
      if (best && reach) {
        set("city", best.city);
        if (!km || (settings.radius_km ?? 0) < reach) set("radius_km", Math.max(reach, settings.radius_km ?? 0) as AlertSettings["radius_km"]);
      } else {
        set("city", "sweden");
        return { settings, understood, farTown: town.name };
      }
    }
  }
  return { settings, understood };
}

/** Short "Daily · 5 jobs · Logistics · Gothenburg (25 km)" line of what was understood. */
export function describeUnderstood(r: SentenceResult, locale: "en" | "sv"): string {
  const s = r.settings;
  const sv = locale === "sv";
  const parts: string[] = [];
  if (s.frequency) parts.push(sv ? { daily: "Varje dag", weekly: "Varje vecka", monthly: "Varje månad" }[s.frequency] : { daily: "Daily", weekly: "Weekly", monthly: "Monthly" }[s.frequency]);
  if (s.count) parts.push(sv ? `${s.count} jobb` : `${s.count} jobs`);
  if (s.categories?.length) parts.push(s.categories.map((c) => CATEGORY_LABEL[locale][c]).join(", "));
  if (s.city) parts.push(s.city === "sweden" ? (sv ? "Hela Sverige" : "All of Sweden") : `${{ gothenburg: "Göteborg", stockholm: "Stockholm", malmo: "Malmö", jonkoping: "Jönköping", boras: "Borås" }[s.city]}${s.radius_km ? ` (${s.radius_km} km)` : ""}`);
  else if (s.radius_km) parts.push(`${s.radius_km} km`);
  if (s.min_match) parts.push(sv ? `minst ${s.min_match} %` : `${s.min_match}%+ match`);
  return parts.join(" · ");
}
