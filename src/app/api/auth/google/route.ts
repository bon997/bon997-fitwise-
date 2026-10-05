import { NextResponse } from "next/server";
import { OAUTH_COOKIE, OAuthError, safeReturnTo, startGoogleLogin } from "@/lib/google-oauth";
import { cookieOptions } from "@/lib/session";

/** GET /api/auth/google?returnTo=/dashboard — sends the browser to Google's account picker. */
export async function GET(req: Request) {
  const returnTo = safeReturnTo(new URL(req.url).searchParams.get("returnTo"));
  try {
    const { url, cookieValue } = startGoogleLogin(req, returnTo);
    const res = NextResponse.redirect(url);
    res.cookies.set(OAUTH_COOKIE, cookieValue, cookieOptions(10 * 60)); // 10 minutes to finish signing in
    return res;
  } catch (e) {
    const code = e instanceof OAuthError ? e.code : "unknown";
    console.error("google login start failed", e);
    return NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
  }
}
