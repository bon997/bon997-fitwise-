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
    database_ssl: process.env.DATABASE_SSL?.trim().toLowerCase() === "true",
  };
  if (raw && config.starts_with_postgresql) {
    try {
      const u = new URL(raw);
      Object.assign(config, {
        // Enough to spot a wrong host or port without publishing the connection details.
        host_is_supabase_pooler: u.hostname.endsWith(".pooler.supabase.com"),
        port: u.port || "5432",
        password_set: u.password.length > 0,
        password_is_placeholder: /YOUR-PASSWORD|^PASSWORD$/i.test(decodeURIComponent(u.password)),
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

  // Presence and shape only: never the values.
  const aiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  const setup = {
    ai_key_set: aiKey.length > 0,
    // A key copied from the masked list view contains "…" and is unusable.
    ai_key_looks_right: /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(aiKey),
    admin_emails_set: Boolean(process.env.ADMIN_EMAILS?.trim()),
    job_source_key_set: Boolean(process.env.SERPAPI_KEY?.trim() || process.env.RAPIDAPI_KEY?.trim()),
    // Names only (never values) of AI-related settings, and whether any holds characters an
    // HTTP header can't carry, such as the "…" in a key copied from a masked preview.
    ai_settings: Object.keys(process.env)
      .filter((k) => /^(ANTHROPIC|CLAUDE)_/.test(k))
      .map((k) => ({ name: k, has_bad_characters: /[^\x20-\x7e]/.test(process.env[k] ?? "") })),
    google_sign_in_set: Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()),
  };

  return NextResponse.json({ config, database, setup }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
