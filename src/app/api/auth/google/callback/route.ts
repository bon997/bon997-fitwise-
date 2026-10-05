import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { OAUTH_COOKIE, OAuthError, appUrl, exchangeCode, readOAuthCookie, upsertGoogleUser } from "@/lib/google-oauth";
import { SESSION_COOKIE, SESSION_DAYS, cookieOptions, createSession, readCookie } from "@/lib/session";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** GET /api/auth/google/callback — Google sends the user back here with ?code&state. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = appUrl(req);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${base}/login?error=${code}`);
    res.cookies.set(OAUTH_COOKIE, "", cookieOptions(0));
    return res;
  };

  // User clicked "Cancel" on Google's screen.
  if (url.searchParams.get("error")) return fail("cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = readOAuthCookie(readCookie(req, OAUTH_COOKIE));
  // state must match the cookie we set: proves this browser started the login (CSRF protection).
  if (!code || !state || !saved || !same(state, saved.state)) return fail("invalid_state");

  try {
    const profile = await exchangeCode(req, code, saved.verifier);
    const user = await upsertGoogleUser(profile);
    const token = await createSession(user.id, req.headers.get("user-agent"));

    const res = NextResponse.redirect(`${base}${saved.returnTo}`);
    res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 86_400));
    res.cookies.set(OAUTH_COOKIE, "", cookieOptions(0));
    return res;
  } catch (e) {
    console.error("google login callback failed", e);
    return fail(e instanceof OAuthError ? e.code : "unknown");
  }
}
