import { z } from "zod";
import { route, ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";

const Body = z.object({
  titles: z.array(z.string().trim().min(2).max(100)).max(10).default([]),
  places: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  types: z.array(z.enum(["full_time", "part_time", "contract", "internship"])).max(4).default([]),
  remote: z.boolean().default(false),
});

/**
 * POST /api/onboarding/preview — how many open jobs match the onboarding answers right now,
 * plus the three newest. A real count from the database, shown before the CV step.
 */
export const POST = route(async (req: Request) => {
  await requireUser(req);
  const b = Body.parse(await readJson(req));
  const where = ["j.is_active"];
  const args: unknown[] = [];
  const arg = (v: unknown) => `$${args.push(v)}`;

  if (b.titles.length) {
    // A title matches on the whole phrase, in the ad's title or its searchable text.
    const parts = b.titles.map((t) => `(j.title ILIKE ${arg(`%${t}%`)} OR j.search_vector @@ phraseto_tsquery('english', ${arg(t)}))`);
    where.push(`(${parts.join(" OR ")})`);
  }
  if (b.remote) where.push("j.remote");
  else if (b.places.length) {
    const towns = arg(b.places.map((p) => p.toLowerCase()));
    where.push(`(lower(trim(split_part(j.location, ',', 1))) = ANY(${towns}::text[])
                 OR lower(trim(split_part(j.location, ',', 2))) = ANY(${towns}::text[]) OR j.remote)`);
  }
  if (b.types.length) where.push(`(j.employment_type IS NULL OR j.employment_type = ANY(${arg(b.types)}::text[]))`);

  const rows = await sql<{ id: string; title: string; company: string; location: string | null; total: number }>(
    `SELECT j.id, j.title, j.company, j.location, count(*) OVER ()::int AS total
     FROM jobs j WHERE ${where.join(" AND ")}
     ORDER BY coalesce(j.posted_at, j.created_at) DESC LIMIT 3`,
    args,
  );
  return ok({ count: rows[0]?.total ?? 0, examples: rows.map(({ total: _t, ...r }) => r) });
});
