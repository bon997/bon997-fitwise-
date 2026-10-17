/**
 * Brute-force protection for password sign-in, stored in Postgres so it works
 * across serverless instances. Only failures are recorded.
 */
import { sql, one } from "./db";

const WINDOW_MINUTES = 15;
const MAX_PER_EMAIL = 8;
const MAX_PER_IP = 30;

export function clientIp(req: Request): string {
  // Vercel and most proxies put the real client first in x-forwarded-for.
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

export async function isLockedOut(email: string, ip: string): Promise<boolean> {
  const row = await one<{ by_email: number; by_ip: number }>(
    `SELECT
       count(*) FILTER (WHERE email = $1)::int AS by_email,
       count(*) FILTER (WHERE ip = $2)::int    AS by_ip
     FROM login_attempts
     WHERE created_at > now() - make_interval(mins => $3) AND (email = $1 OR ip = $2)`,
    [email, ip, WINDOW_MINUTES],
  );
  return (row?.by_email ?? 0) >= MAX_PER_EMAIL || (row?.by_ip ?? 0) >= MAX_PER_IP;
}

export async function recordFailure(email: string, ip: string): Promise<void> {
  await sql("INSERT INTO login_attempts (email, ip) VALUES ($1, $2)", [email, ip]);
  if (Math.random() < 0.05) await sql("DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'");
}

export async function clearFailures(email: string): Promise<void> {
  await sql("DELETE FROM login_attempts WHERE email = $1", [email]);
}
