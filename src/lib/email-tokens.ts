/**
 * One-time links sent by email (password reset, email confirmation). Each
 * carries a random 256-bit token; the database stores only its SHA-256 hash.
 */
import { createHash, randomBytes } from "node:crypto";
import { one, sql } from "./db";

export type TokenPurpose = "reset" | "verify";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const plausible = (token: string) => Boolean(token) && token.length <= 100;

/** A new token, or null when this account already got `perHour` of these emails in the last hour. */
export async function createEmailToken(userId: string, purpose: TokenPurpose, minutes: number, perHour: number): Promise<string | null> {
  const recent = await one<{ n: number }>(
    "SELECT count(*)::int AS n FROM email_tokens WHERE user_id = $1 AND purpose = $2 AND created_at > now() - interval '1 hour'",
    [userId, purpose],
  );
  if ((recent?.n ?? 0) >= perHour) return null;
  const token = randomBytes(32).toString("base64url");
  await sql(
    "INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, $3, now() + make_interval(mins => $4))",
    [hash(token), userId, purpose, minutes],
  );
  if (Math.random() < 0.05) await sql("DELETE FROM email_tokens WHERE expires_at < now() - interval '1 day'");
  return token;
}

/** The token's user, while it is unused and unexpired. */
export async function tokenUser(token: string, purpose: TokenPurpose): Promise<{ id: string; email: string } | null> {
  if (!plausible(token)) return null;
  return one<{ id: string; email: string }>(
    `SELECT u.id, u.email FROM email_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1 AND t.purpose = $2 AND t.used_at IS NULL AND t.expires_at > now()`,
    [hash(token), purpose],
  );
}

/** Marks the token used. Atomic, so two clicks at once can't both succeed. Returns the user id, or null. */
export async function spendToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  if (!plausible(token)) return null;
  const row = await one<{ user_id: string }>(
    "UPDATE email_tokens SET used_at = now() WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now() RETURNING user_id",
    [hash(token), purpose],
  );
  return row?.user_id ?? null;
}

export async function dropUnusedTokens(userId: string, purpose: TokenPurpose) {
  await sql("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL", [userId, purpose]);
}
