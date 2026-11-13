/**
 * Job alert settings: how often, how many, which categories, where, and how
 * good a match must be. Stored in users.preferences.alerts; the on/off switch
 * stays users.job_alerts. Pure functions only (no database), so they're testable.
 */
import { z } from "zod";
import { hasTerm } from "./priorities";

export const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export const COUNTS = [3, 5, 10, 20] as const;
export const RADII = [25, 50, 100, 200] as const;
export const MIN_MATCHES = [60, 70, 80, 90] as const;
export const CATEGORIES = ["logistics", "supply_chain", "warehouse", "transport", "procurement", "purchasing", "operations", "manufacturing"] as const;
export const CITIES = ["gothenburg", "stockholm", "malmo", "jonkoping", "boras", "sweden"] as const;

export type Frequency = (typeof FREQUENCIES)[number];
export type Category = (typeof CATEGORIES)[number];
export type City = (typeof CITIES)[number];

const oneOf = <T extends readonly number[]>(xs: T) => z.number().refine((n): n is T[number] => xs.includes(n), { message: `One of ${xs.join(", ")}` });

export const AlertSettingsSchema = z.object({
  frequency: z.enum(FREQUENCIES),
  count: oneOf(COUNTS),
  categories: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length),
  city: z.enum(CITIES),
  radius_km: oneOf(RADII),
  min_match: oneOf(MIN_MATCHES),
});
export type AlertSettings = z.infer<typeof AlertSettingsSchema>;

/** Matches what alerts did before settings existed: weekly, 5 jobs, anywhere, any category. */
export const DEFAULT_ALERTS: AlertSettings = { frequency: "weekly", count: 5, categories: [], city: "sweden", radius_km: 100, min_match: 60 };

export function alertSettingsFor(prefs: { alerts?: unknown } | null | undefined): AlertSettings {
  const parsed = AlertSettingsSchema.safeParse({ ...DEFAULT_ALERTS, ...((prefs?.alerts as object) ?? {}) });
  return parsed.success ? parsed.data : DEFAULT_ALERTS;
}

// ── Categories ───────────────────────────────────────────────────────────
/** Words that put a job in a category, matched in its title and skills (Swedish and English). */
export const CATEGORY_TERMS: Record<Category, string[]> = {
  logistics: ["logistik", "logistics", "speditör", "spedition", "freight forwarder", "forwarding"],
  supply_chain: ["supply chain", "scm", "försörjningskedja", "materialplaner", "material planner", "demand planner", "efterfrågeplaner", "s&op"],
  warehouse: ["lager", "warehouse", "truckförare", "forklift", "plockare", "terminal", "wms", "inleverans"],
  transport: ["transport", "trafikledare", "trafikplaner", "chaufför", "driver", "åkeri", "distribution", "lastbil"],
  procurement: ["procurement", "upphandl", "inköp", "sourcing", "category manager", "kategoriansvarig"],
  purchasing: ["purchasing", "inköpare", "buyer", "purchaser", "inköpsassistent", "orderhandläggare"],
  operations: ["operations", "driftchef", "driftledare", "operativ", "verksamhetsutveckl", "site manager"],
  manufacturing: ["manufacturing", "produktion", "production", "tillverkning", "montör", "maskinoperatör", "processoperatör"],
};

export function inCategories(job: { title: string; skills?: { name: string }[] | null }, categories: Category[]): boolean {
  if (categories.length === 0) return true;
  const text = `${job.title} ${(job.skills ?? []).map((s) => s.name).join(" ")}`.toLowerCase();
  return categories.some((c) => CATEGORY_TERMS[c].some((t) => hasTerm(text, t)));
}

// ── Location ─────────────────────────────────────────────────────────────
/** Town centres (lat, lon), enough to place most Swedish job ads within a few km. */
const TOWNS: Record<string, [number, number]> = {
  "göteborg": [57.709, 11.975], "stockholm": [59.329, 18.069], "malmö": [55.605, 13.004], "jönköping": [57.783, 14.162],
  "borås": [57.721, 12.940], "uppsala": [59.859, 17.639], "västerås": [59.610, 16.545], "örebro": [59.275, 15.213],
  "linköping": [58.411, 15.621], "norrköping": [58.588, 16.192], "helsingborg": [56.047, 12.695], "lund": [55.705, 13.191],
  "umeå": [63.826, 20.263], "gävle": [60.675, 17.141], "södertälje": [59.196, 17.625], "eskilstuna": [59.367, 16.508],
  "halmstad": [56.675, 12.858], "växjö": [56.878, 14.809], "karlstad": [59.379, 13.504], "sundsvall": [62.391, 17.307],
  "östersund": [63.179, 14.636], "trollhättan": [58.284, 12.289], "luleå": [65.585, 22.155], "borlänge": [60.486, 15.437],
  "kristianstad": [56.029, 14.157], "kalmar": [56.663, 16.357], "falun": [60.607, 15.636], "skövde": [58.391, 13.845],
  "karlskrona": [56.161, 15.587], "skellefteå": [64.751, 20.953], "uddevalla": [58.350, 11.936], "varberg": [57.106, 12.251],
  "landskrona": [55.871, 12.830], "nyköping": [58.753, 17.008], "motala": [58.537, 15.037], "trelleborg": [55.375, 13.157],
  "ängelholm": [56.243, 12.862], "lerum": [57.771, 12.269], "alingsås": [57.930, 12.534], "kungsbacka": [57.487, 12.076],
  "mölndal": [57.655, 12.014], "partille": [57.740, 12.106], "kungälv": [57.871, 11.981], "stenungsund": [58.071, 11.818],
  "vänersborg": [58.381, 12.323], "lidköping": [58.505, 13.158], "falköping": [58.174, 13.551], "ulricehamn": [57.792, 13.414],
  "kinna": [57.510, 12.694], "värnamo": [57.186, 14.040], "nässjö": [57.653, 14.697], "vetlanda": [57.428, 15.078],
  "huskvarna": [57.787, 14.302], "gislaved": [57.304, 13.540], "hässleholm": [56.159, 13.767], "ystad": [55.430, 13.820],
  "eslöv": [55.839, 13.304], "enköping": [59.636, 17.078], "sigtuna": [59.617, 17.724], "märsta": [59.622, 17.855],
  "arlanda": [59.650, 17.930], "solna": [59.360, 18.001], "sollentuna": [59.428, 17.951], "täby": [59.444, 18.069],
  "huddinge": [59.237, 17.982], "nacka": [59.311, 18.164], "tumba": [59.200, 17.834], "botkyrka": [59.200, 17.834],
  "haninge": [59.168, 18.144], "järfälla": [59.424, 17.834], "norrtälje": [59.758, 18.705], "katrineholm": [58.996, 16.207],
  "piteå": [65.317, 21.479], "örnsköldsvik": [63.291, 18.715], "härnösand": [62.632, 17.938], "kiruna": [67.856, 20.225],
  "visby": [57.635, 18.295], "arvika": [59.655, 12.585], "kumla": [59.128, 15.143], "hallsberg": [59.067, 15.110],
  "mariestad": [58.710, 13.824], "ljungby": [56.833, 13.941], "älmhult": [56.551, 14.137], "oskarshamn": [57.265, 16.448],
  "västervik": [57.758, 16.637], "hudiksvall": [61.729, 17.104], "sandviken": [60.622, 16.776], "ludvika": [60.150, 15.188],
  "mora": [61.005, 14.538], "avesta": [60.146, 16.168], "köping": [59.514, 15.993], "sala": [59.922, 16.607],
  "strängnäs": [59.377, 17.031], "landvetter": [57.684, 12.206], "torslanda": [57.721, 11.770], "hisings backa": [57.750, 11.990],
  "åstorp": [56.135, 12.945], "bjuv": [56.084, 12.919], "staffanstorp": [55.643, 13.206], "burlöv": [55.637, 13.083],
  "vellinge": [55.471, 13.020], "svedala": [55.508, 13.234], "höganäs": [56.199, 12.557], "laholm": [56.512, 13.044],
  "herrljunga": [58.078, 13.024], "vårgårda": [58.034, 12.808], "tranemo": [57.485, 13.351], "svenljunga": [57.495, 13.111],
  "bollebygd": [57.669, 12.570], "ale": [57.927, 12.083], "nödinge": [57.927, 12.083], "surte": [57.824, 12.017],
};

/** English and ASCII spellings seen in job feeds. */
const ALIASES: Record<string, string> = {
  gothenburg: "göteborg", goteborg: "göteborg", malmo: "malmö", jonkoping: "jönköping", boras: "borås",
  vasteras: "västerås", orebro: "örebro", linkoping: "linköping", norrkoping: "norrköping", umea: "umeå",
  gavle: "gävle", sodertalje: "södertälje", vaxjo: "växjö", ostersund: "östersund", trollhattan: "trollhättan",
  lulea: "luleå", borlange: "borlänge", skovde: "skövde", skelleftea: "skellefteå", molndal: "mölndal",
  kungalv: "kungälv", lidkoping: "lidköping", falkoping: "falköping", nassjo: "nässjö", jarfalla: "järfälla",
  norrtalje: "norrtälje", angelholm: "ängelholm", alingsas: "alingsås", almhult: "älmhult", "hisingen": "göteborg",
};

export const CITY_CENTRE: Record<Exclude<City, "sweden">, [number, number]> = {
  gothenburg: TOWNS["göteborg"], stockholm: TOWNS["stockholm"], malmo: TOWNS["malmö"], jonkoping: TOWNS["jönköping"], boras: TOWNS["borås"],
};

const NAMES = [...Object.keys(TOWNS), ...Object.keys(ALIASES)].sort((a, b) => b.length - a.length);

/** The town a job's location text names, or null. "Kungsbacka, Hallands län" → kungsbacka. */
export function townOf(location: string | null | undefined): [number, number] | null {
  if (!location) return null;
  const text = location.toLowerCase();
  for (const name of NAMES) {
    if (new RegExp(`(^|[^\\p{L}])${name}($|[^\\p{L}])`, "u").test(text)) return TOWNS[ALIASES[name] ?? name] ?? null;
  }
  return null;
}

/** Great-circle distance in km. */
export function distanceKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/**
 * Within the chosen area? Sweden-wide takes everything; remote jobs always fit;
 * an ad whose town we can't place is left out (better than a wrong promise).
 * Returns the distance in km when it's known.
 */
export function inArea(job: { location: string | null; remote: boolean }, s: Pick<AlertSettings, "city" | "radius_km">): { ok: boolean; km: number | null } {
  if (s.city === "sweden") return { ok: true, km: null };
  if (job.remote) return { ok: true, km: null };
  const town = townOf(job.location);
  if (!town) return { ok: false, km: null };
  const km = Math.round(distanceKm(CITY_CENTRE[s.city], town));
  return { ok: km <= s.radius_km, km };
}

// ── Schedule ─────────────────────────────────────────────────────────────
/** Stockholm calendar date, weekday (1 = Monday) and day of month for an instant. */
export function stockholmDay(d: Date): { date: string; weekday: number; dom: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday, dom: Number(parts.day) };
}

/**
 * Is an alert due today (Stockholm time)? Daily: once per day. Weekly: Mondays.
 * Monthly: the 1st. A run that missed someone (e.g. out of time) catches up
 * the next day: weekly after 8 days, monthly after 32.
 */
export function isDue(freq: Frequency, lastSent: Date | null, now = new Date()): boolean {
  const today = stockholmDay(now);
  if (lastSent && stockholmDay(lastSent).date === today.date) return false; // never twice a day
  const ageDays = lastSent ? (now.getTime() - lastSent.getTime()) / 86_400_000 : Infinity;
  if (freq === "daily") return true;
  if (freq === "weekly") return today.weekday === 1 || (lastSent != null && ageDays > 8);
  return today.dom === 1 || (lastSent != null && ageDays > 32);
}

/** How far back to look for new jobs when there's no previous alert. */
export const WINDOW_DAYS: Record<Frequency, number> = { daily: 2, weekly: 7, monthly: 31 };

// ── Wording ──────────────────────────────────────────────────────────────
export const CATEGORY_LABEL: Record<"en" | "sv", Record<Category, string>> = {
  en: { logistics: "Logistics", supply_chain: "Supply Chain", warehouse: "Warehouse", transport: "Transport", procurement: "Procurement", purchasing: "Purchasing", operations: "Operations", manufacturing: "Manufacturing" },
  sv: { logistics: "Logistik", supply_chain: "Supply chain", warehouse: "Lager", transport: "Transport", procurement: "Upphandling", purchasing: "Inköp", operations: "Drift", manufacturing: "Tillverkning" },
};
export const CITY_LABEL: Record<"en" | "sv", Record<City, string>> = {
  en: { gothenburg: "Gothenburg", stockholm: "Stockholm", malmo: "Malmö", jonkoping: "Jönköping", boras: "Borås", sweden: "all of Sweden" },
  sv: { gothenburg: "Göteborg", stockholm: "Stockholm", malmo: "Malmö", jonkoping: "Jönköping", boras: "Borås", sweden: "hela Sverige" },
};

/** "Logistics", "Logistics & Supply Chain", or "" for none/many. */
function categoryPhrase(cats: Category[], locale: "en" | "sv"): string {
  if (cats.length === 0 || cats.length > 2) return "";
  return cats.map((c) => CATEGORY_LABEL[locale][c]).join(" & ");
}

/** "Today's Top 3 Logistics Jobs Matching Your Profile" */
export function alertSubject(s: Pick<AlertSettings, "frequency" | "categories">, n: number, locale: "en" | "sv"): string {
  const cat = categoryPhrase(s.categories, locale);
  if (locale === "sv") {
    const when = { daily: "Dagens", weekly: "Veckans", monthly: "Månadens" }[s.frequency];
    const what = cat ? `jobb inom ${cat.toLowerCase()}` : "jobb";
    return n === 1 ? `${when} bästa ${what} som matchar din profil` : `${when} topp ${n}: ${what} som matchar din profil`;
  }
  const when = { daily: "Today's", weekly: "This Week's", monthly: "This Month's" }[s.frequency];
  return `${when} Top ${n === 1 ? "" : `${n} `}${cat ? `${cat} ` : ""}Job${n === 1 ? "" : "s"} Matching Your Profile`;
}

/** The plain-language promise shown under the settings. */
export function alertSummary(s: AlertSettings, locale: "en" | "sv"): string {
  const cats = s.categories.map((c) => CATEGORY_LABEL[locale][c]);
  if (locale === "sv") {
    const when = { daily: "Varje dag", weekly: "Varje måndag", monthly: "Den 1:a varje månad" }[s.frequency];
    const what = cats.length ? `jobben inom ${cats.join(", ").toLowerCase()}` : "jobben";
    const where = s.city === "sweden" ? "i hela Sverige" : `inom ${s.radius_km} km från ${CITY_LABEL.sv[s.city]}`;
    return `${when} får du de ${s.count} bästa ${what} ${where} som matchar minst ${s.min_match} % av din profil.`;
  }
  const when = { daily: "Every day", weekly: "Every Monday", monthly: "On the 1st of every month" }[s.frequency];
  const what = cats.length ? `${cats.join(", ")} jobs` : "jobs";
  const where = s.city === "sweden" ? "anywhere in Sweden" : `within ${s.radius_km} km of ${CITY_LABEL.en[s.city]}`;
  return `${when} you get the ${s.count} best ${what} ${where} that match at least ${s.min_match}% of your profile.`;
}
