import { NextResponse } from "next/server";
import { pool, databaseUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — a setup check that is safe to open in a browser.
 * Says whether the database is reachable and, if not, why. Never shows the password.
 */
export async function GET() {
  const raw = databaseUrl();
  const config: Record<string, unknown> = {
    database_url_set: Boolean(raw),
    starts_with_postgresql: raw ? /^postgres(ql)?:\/\//i.test(raw) : false,
    database_ssl: process.env.DATABASE_SSL ?? null,
  };
  if (raw && config.starts_with_postgresql) {
    try {
      const u = new URL(raw);
      Object.assign(config, {
        host: u.hostname,
        port: u.port || "5432",
        user: decodeURIComponent(u.username),
        password_set: u.password.length > 0,
        password_is_placeholder: /YOUR-PASSWORD|^PASSWORD$/i.test(decodeURIComponent(u.password)),
        database: u.pathname.replace(/^\//, ""),
      });
    } catch {
      config.parse_error = "The value is not a valid URL (a special character in the password can cause this).";
    }
  }

  let database: Record<string, unknown>;
  try {
    const { rows } = await pool.query<{ users: string | null }>("SELECT to_regclass('public.users')::text AS users");
    database = { ok: true, tables_created: rows[0]?.users != null };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    let message = String(err.message ?? e);
    const pw = raw ? (() => { try { return decodeURIComponent(new URL(raw).password); } catch { return ""; } })() : "";
    if (pw) message = message.split(pw).join("****");
    database = { ok: false, code: err.code ?? null, message: message.slice(0, 300) };
  }

  return NextResponse.json({ config, database }, { status: database.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
