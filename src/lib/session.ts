/**
 * Database-backed sessions. The browser gets a random 256-bit token in an
 * httpOnly cookie; the database stores only its SHA-256 hash.
 */
import { createHash, randomBytes } from "node:crypto";
import { sql, one } from "./db";

export const SESSION_COOKIE = "fw_session";
export const SESSION_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // "lax" lets the cookie survive the redirect back from Google
  path: "/",
  maxAge: maxAgeSeconds,
});

export async function createSession(userId: string, userAgent: string | null): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql(
    "INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, now() + make_interval(days => $3), $4)",
    [hash(token), userId, SESSION_DAYS, userAgent?.slice(0, 300) ?? null],
  );
  // Opportunistic cleanup so the table doesn't grow forever.
  if (Math.random() < 0.05) await sql("DELETE FROM sessions WHERE expires_at < now()");
  return token;
}

export async function userIdFromToken(token: string | undefined | null): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const row = await one<{ user_id: string }>(
    "SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()",
    [hash(token)],
  );
  return row?.user_id ?? null;
}

export async function deleteSession(token: string | undefined | null) {
  if (token) await sql("DELETE FROM sessions WHERE token_hash = $1", [hash(token)]);
}

/** Read one cookie from a raw Request (route handlers receive a plain Request). */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
