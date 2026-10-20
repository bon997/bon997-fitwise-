/**
 * Password hashing with scrypt (built into Node, no extra dependency).
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64>, so parameters can
 * be raised later without breaking existing hashes.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384; // CPU/memory cost
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Spend the same time as a real check, so "no such account" isn't detectable by timing. */
const DUMMY = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(KEYLEN).toString("base64");
export async function burnPasswordCheck(password: string): Promise<void> {
  await verifyPassword(password, DUMMY);
}

/** Returns a reason the password is too weak, or null if it's acceptable. */
export function passwordProblem(password: string, email?: string, locale: "en" | "sv" = "en"): string | null {
  const sv = locale === "sv";
  if (password.length < 10) return sv ? "Använd minst 10 tecken." : "Use at least 10 characters.";
  if (password.length > 200) return sv ? "Lösenordet är för långt." : "That password is too long.";
  if (/^(.)\1+$/.test(password)) return sv ? "Använd inte samma tecken upprepat." : "Don't use a single repeated character.";
  const lower = password.toLowerCase();
  if (["password", "qwerty", "123456", "letmein", "fitwise"].some((w) => lower.includes(w))) {
    return sv ? "Lösenordet är för lätt att gissa." : "That password is too easy to guess.";
  }
  if (email && lower.includes(email.toLowerCase().split("@")[0]) && email.split("@")[0].length >= 4) {
    return sv ? "Ta inte med namnet från din e-postadress i lösenordet." : "Don't include your email name in the password.";
  }
  return null;
}
