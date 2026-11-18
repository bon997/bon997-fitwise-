import { pool } from "./db";
import { MIGRATIONS } from "./migrations.generated";

/**
 * Brings the database up to date on server start-up, so nobody has to paste SQL into
 * Supabase before a deploy. Applies each db/migrations-*.sql file once, in name order,
 * recorded in schema_migrations.
 *
 * Everything runs in ONE transaction holding an advisory lock, which works through
 * Supabase's transaction pooler too, so parallel cold starts can't apply a file twice.
 * A failure rolls everything back and is logged; the site keeps serving.
 */
export async function migrate(): Promise<{ applied: string[] } | { error: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(4207051)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    await client.query("ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY");
    const done = new Set((await client.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map((r) => r.id));
    const applied: string[] = [];
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await client.query(m.sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING", [m.id]);
      applied.push(m.id);
    }
    await client.query("COMMIT");
    if (applied.length) console.log("database migrated:", applied.join(", "));
    return { applied };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("database migration failed; run the SQL in db/ by hand", e);
    return { error: (e as Error).message };
  } finally {
    client.release();
  }
}
