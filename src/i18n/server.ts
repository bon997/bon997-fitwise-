import { cookies, headers } from "next/headers";
import { isLocale, localeFromAcceptLanguage, LOCALE_COOKIE, type Locale } from "./config";

/** The visitor's language: their explicit choice (cookie), else their browser's preference. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

/** Same, for route handlers that have the Request. */
export function localeFromRequest(req: Request): Locale {
  const m = /(?:^|;\s*)fw_lang=(sv|en)\b/.exec(req.headers.get("cookie") ?? "");
  if (m && isLocale(m[1])) return m[1];
  return localeFromAcceptLanguage(req.headers.get("accept-language"));
}

/** One user-facing sentence in the request's language: `say(req, "English", "Svenska")`. */
export function say(req: Request, en: string, sv: string): string {
  return localeFromRequest(req) === "sv" ? sv : en;
}
