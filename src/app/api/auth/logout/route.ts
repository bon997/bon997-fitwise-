import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, deleteSession, readCookie } from "@/lib/session";

/** POST /api/auth/logout — ends the session. POST only, so a link or image can't log you out. */
export async function POST(req: Request) {
  await deleteSession(readCookie(req, SESSION_COOKIE));
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}
