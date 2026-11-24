import { NextResponse } from "next/server";
import { APP_COOKIE, launchedFromAndroidApp } from "@/lib/app-mode";

/**
 * GET /app — the installed app's start page (manifest start_url). Remembers when we run inside
 * the Android app (for the Play payments rules), then opens the dashboard.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/dashboard", url), 307);
  if (launchedFromAndroidApp(req.headers.get("referer"), url.searchParams)) {
    res.cookies.set(APP_COOKIE, "android", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: url.protocol === "https:" });
  }
  return res;
}
