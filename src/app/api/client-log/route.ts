/**
 * POST /api/client-log — tiny diagnostics beacon from the browser (e.g. a CV upload that
 * never reached the server). Only written to the server log; nothing is stored.
 */
export async function POST(req: Request) {
  const text = (await req.text().catch(() => "")).slice(0, 600);
  console.warn("client-log", text, "ua:", (req.headers.get("user-agent") ?? "").slice(0, 160));
  return new Response(null, { status: 204 });
}
