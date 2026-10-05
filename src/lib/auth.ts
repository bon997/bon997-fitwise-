/**
 * Who is calling? Every protected route goes through getUserId / requireUser / requireAdmin.
 *
 * Signed-in users are identified by the session cookie set at Google sign-in.
 * For API testing in development only, an `x-user-id` header is also accepted;
 * it is ignored in production.
 */
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { one } from "./db";
import { HttpError, UUID } from "./http";
import { SESSION_COOKIE, readCookie, userIdFromToken } from "./session";
import type { UserRow } from "./data";

export async function getUserId(req: Request): Promise<string | null> {
  const fromSession = await userIdFromToken(readCookie(req, SESSION_COOKIE));
  if (fromSession) return fromSession;
  if (process.env.NODE_ENV !== "production") {
    const id = req.headers.get("x-user-id");
    if (id && UUID.test(id)) return id;
  }
  return null;
}

/** For server components (pages), which have no Request object. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = await userIdFromToken(token);
  return id ? one<UserRow>("SELECT * FROM users WHERE id = $1", [id]) : null;
}

export async function getUser(req: Request): Promise<UserRow | null> {
  const id = await getUserId(req);
  if (!id) return null;
  return one<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
}

export async function requireUser(req: Request): Promise<UserRow> {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "Sign in required");
  return user;
}

export async function requireAdmin(req: Request): Promise<UserRow> {
  const user = await requireUser(req);
  if (user.role !== "admin") throw new HttpError(403, "Admins only");
  return user;
}

/** Scheduled jobs (e.g. Vercel Cron) authenticate with `Authorization: Bearer $CRON_SECRET`. */
export function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
