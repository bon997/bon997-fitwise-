/**
 * "Sign in with Google" using the OAuth 2.0 authorization-code flow with PKCE.
 * No auth library needed: it's two redirects and one server-to-server call.
 *
 *   1. /api/auth/google            → redirect to Google with state + PKCE challenge
 *   2. Google                      → user picks their Gmail account and consents
 *   3. /api/auth/google/callback   → check state, exchange code for an ID token,
 *                                    find-or-create the user, start a session
 */
import { createHash, randomBytes } from "node:crypto";
import { one } from "./db";
import type { UserRow } from "./data";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// Overridable outside production only, so the callback can be tested against a local fake.
const TOKEN_URL =
  (process.env.NODE_ENV !== "production" && process.env.GOOGLE_TOKEN_URL) || "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export const OAUTH_COOKIE = "fw_oauth";

export class OAuthError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new OAuthError("not_configured", "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set");
  return { clientId, clientSecret };
}

/** Public base URL of the app. Set APP_URL in production so it matches the redirect URI registered with Google. */
export function appUrl(req: Request): string {
  return (process.env.APP_URL ?? new URL(req.url).origin).replace(/\/+$/, "");
}

export const redirectUri = (req: Request) => `${appUrl(req)}/api/auth/google/callback`;

/** Only allow same-site relative paths, so the login can't be used as an open redirect. */
export function safeReturnTo(v: string | null | undefined): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/dashboard";
  return v.slice(0, 500);
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function startGoogleLogin(req: Request, returnTo: string) {
  const { clientId } = googleConfig();
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());

  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  // state, verifier and returnTo travel in a short-lived httpOnly cookie, never in the URL.
  const cookieValue = b64url(Buffer.from(JSON.stringify({ state, verifier, returnTo })));
  return { url: url.toString(), cookieValue };
}

export function readOAuthCookie(value: string | null): { state: string; verifier: string; returnTo: string } | null {
  if (!value) return null;
  try {
    const v = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof v.state === "string" && typeof v.verifier === "string" ? { ...v, returnTo: safeReturnTo(v.returnTo) } : null;
  } catch {
    return null;
  }
}

export type GoogleProfile = { sub: string; email: string; name: string | null; picture: string | null };

/**
 * Exchange the code for tokens and read the ID token. Because the token comes
 * straight from Google's token endpoint over TLS, OpenID Connect allows trusting
 * it without verifying the signature; we still check issuer, audience and expiry.
 */
export async function exchangeCode(req: Request, code: string, verifier: string): Promise<GoogleProfile> {
  const { clientId, clientSecret } = googleConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new OAuthError("token_exchange_failed", `Google token endpoint ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new OAuthError("no_id_token");

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    throw new OAuthError("bad_id_token");
  }

  if (!ISSUERS.has(String(claims.iss))) throw new OAuthError("bad_issuer");
  const aud = claims.aud;
  if (aud !== clientId && !(Array.isArray(aud) && aud.includes(clientId))) throw new OAuthError("bad_audience");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now() - 60_000) throw new OAuthError("expired_token");
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") throw new OAuthError("missing_claims");
  if (claims.email_verified !== true && claims.email_verified !== "true") throw new OAuthError("email_not_verified");

  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : null,
    picture: typeof claims.picture === "string" ? claims.picture : null,
  };
}

const adminEmails = () =>
  new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));

/**
 * Find the user by Google ID, else link an existing account with the same
 * (Google-verified) email, else create one. Emails in ADMIN_EMAILS become admins.
 */
export async function upsertGoogleUser(p: GoogleProfile): Promise<UserRow> {
  const role = adminEmails().has(p.email) ? "admin" : null;
  const user = await one<UserRow>(
    `INSERT INTO users (email, name, google_id, role)
     VALUES ($1, $2, $3, coalesce($4::user_role, 'user'))
     ON CONFLICT (email) DO UPDATE SET
       google_id = coalesce(users.google_id, EXCLUDED.google_id),
       name      = coalesce(users.name, EXCLUDED.name),
       role      = CASE WHEN $4::user_role IS NOT NULL THEN $4::user_role ELSE users.role END
     RETURNING *`,
    [p.email, p.name, p.sub, role],
  );
  // Same email but already linked to a different Google account: refuse rather than merge.
  if (!user || user.google_id !== p.sub) throw new OAuthError("account_conflict");
  return user;
}
