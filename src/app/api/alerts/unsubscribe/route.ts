import { NextResponse } from "next/server";
import { unsubscribe, unsubscribeUrl } from "@/lib/job-alerts";
import { appUrl } from "@/lib/google-oauth";

const tokenOf = (req: Request) => new URL(req.url).searchParams.get("t") ?? "";

/**
 * POST /api/alerts/unsubscribe?t=… turns job alerts off. Used by mail apps'
 * one-click Unsubscribe button (RFC 8058) and by the button on /unsubscribe.
 * The token in the link is the only credential and can do nothing else.
 */
export async function POST(req: Request) {
  const token = tokenOf(req);
  const done = await unsubscribe(token);
  // Mail apps only look at the status; people pressing the button go back to the page.
  if (new URL(req.url).searchParams.get("from") === "page") {
    return NextResponse.redirect(`${unsubscribeUrl(appUrl(req), token)}&${done ? "done=1" : "bad=1"}`, 303);
  }
  return new NextResponse(null, { status: done ? 200 : 404 });
}

/** A plain visit shows the confirmation page instead of changing anything. */
export function GET(req: Request) {
  return NextResponse.redirect(unsubscribeUrl(appUrl(req), tokenOf(req)), 303);
}
