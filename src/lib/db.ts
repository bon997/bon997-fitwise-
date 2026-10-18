import { Pool, type QueryResultRow } from "pg";

// Reuse one pool across hot reloads in dev.
const g = globalThis as unknown as { __pgPool?: Pool };

/**
 * Tolerate the usual copy-paste slips in hosting dashboards: surrounding spaces or
 * quotes, a pasted "DATABASE_URL=" prefix. Anything that still isn't a postgres URL
 * gets a clear error instead of a confusing DNS failure.
 */
export function databaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL?.trim();
  if (!url) return undefined;
  url = url.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  url = url.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    console.error(
      `DATABASE_URL must start with "postgresql://" (the saved value is ${url.length} characters and doesn't). ` +
        "Copy the connection string again from Supabase → Connect.",
    );
  }
  return url;
}

export const pool =
  g.__pgPool ??
  new Pool({
    connectionString: databaseUrl(),
    max: Number(process.env.PG_POOL_MAX ?? 10),
    // Supabase and most hosted Postgres require TLS; local dev usually doesn't.
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
if (process.env.NODE_ENV !== "production") g.__pgPool = pool;

export async function sql<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}
