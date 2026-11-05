import { z } from "zod";
import { route, ok, readJson, HttpError, UUID } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { one, sql } from "@/lib/db";
import type { ImportSearch } from "@/lib/scheduled-import";

const Create = z.object({
  source: z.enum(["jobtech", "serpapi", "rapidapi"]),
  query: z.string().trim().min(2).max(200),
  location: z.string().trim().max(100).optional().transform((v) => v || null),
  pages: z.number().int().min(1).max(5).default(1),
});
const Patch = z.object({ id: z.string().regex(UUID), enabled: z.boolean().optional(), pages: z.number().int().min(1).max(5).optional() });
const Delete = z.object({ id: z.string().regex(UUID) });

/** GET /api/admin/import-searches lists the saved daily searches. */
export const GET = route(async (req: Request) => {
  await requireAdmin(req);
  return ok({ searches: await sql<ImportSearch>("SELECT * FROM import_searches ORDER BY created_at") });
});

/** POST { source, query, location?, pages? } saves a search to run every night. */
export const POST = route(async (req: Request) => {
  await requireAdmin(req);
  const b = Create.parse(await readJson(req));
  const row = await one<ImportSearch>(
    `INSERT INTO import_searches (source, query, location, pages) VALUES ($1, $2, $3, $4)
     ON CONFLICT (source, lower(query), lower(coalesce(location, ''))) DO NOTHING RETURNING *`,
    [b.source, b.query, b.location, b.pages],
  );
  if (!row) throw new HttpError(409, "That search is already saved.");
  return ok({ search: row }, { status: 201 });
});

/** PATCH { id, enabled?, pages? } pauses, resumes or resizes a search. */
export const PATCH = route(async (req: Request) => {
  await requireAdmin(req);
  const b = Patch.parse(await readJson(req));
  const row = await one<ImportSearch>(
    "UPDATE import_searches SET enabled = coalesce($2, enabled), pages = coalesce($3, pages) WHERE id = $1 RETURNING *",
    [b.id, b.enabled ?? null, b.pages ?? null],
  );
  if (!row) throw new HttpError(404, "Search not found");
  return ok({ search: row });
});

/** DELETE { id } removes a search. Jobs it already imported stay. */
export const DELETE = route(async (req: Request) => {
  await requireAdmin(req);
  const { id } = Delete.parse(await readJson(req));
  await sql("DELETE FROM import_searches WHERE id = $1", [id]);
  return new Response(null, { status: 204 });
});
