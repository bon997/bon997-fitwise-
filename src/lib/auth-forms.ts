/** Shared pieces for the email + password sign-in routes. */
import { NextResponse } from "next/server";
import { HttpError } from "./http";
import { SESSION_COOKIE, SESSION_DAYS, cookieOptions, createSession } from "./session";
import { appUrl } from "./google-oauth";
import { sql } from "./db";
import { localeFromRequest } from "@/i18n/server";

/**
 * Only accept JSON from our own pages. A cross-site form can't send
 * application/json without a CORS preflight, and the Origin check catches the rest.
 */
export function assertSameOrigin(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Expected JSON");
  const origin = req.headers.get("origin");
  if (origin && origin !== appUrl(req) && origin !== new URL(req.url).origin) throw new HttpError(403, "Bad origin");
}

/** Emails go out in the language the person last used the site in. */
export async function rememberLocale(req: Request, userId: string) {
  await sql("UPDATE users SET locale = $2 WHERE id = $1 AND locale IS DISTINCT FROM $2", [userId, localeFromRequest(req)]);
}

export async function startSession(req: Request, userId: string, redirect: string) {
  const [token] = await Promise.all([createSession(userId, req.headers.get("user-agent")), rememberLocale(req, userId)]);
  const res = NextResponse.json({ ok: true, redirect });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 86_400));
  return res;
}
