import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { requireAdmin, isCron } from "@/lib/auth";
import { runIngest } from "@/lib/ingest";

export const maxDuration = 60; // one page of listings + skill extraction fits comfortably

const Body = z.object({
  source: z.enum(["serpapi", "rapidapi"]),
  query: z.string().trim().min(2).max(200),
  location: z.string().trim().max(100).optional(),
  pages: z.number().int().min(1).max(5).default(1),
});

/**
 * POST /api/jobs/ingest  { source, query, location?, pages? }
 * Admin session or `Authorization: Bearer $CRON_SECRET`.
 * Fetches listings, upserts, extracts skills with Claude, embeds in Pinecone.
 */
export const POST = route(async (req: Request) => {
  if (!isCron(req)) await requireAdmin(req);
  const body = Body.parse(await readJson(req));
  try {
    return ok(await runIngest(body));
  } catch (e) {
    // Only admins and cron reach this point, so the real reason (bad key, quota used up…) is safe to show.
    console.error("ingest failed", e);
    return ok({ error: e instanceof Error ? e.message.slice(0, 300) : "Import failed" }, { status: 502 });
  }
});
