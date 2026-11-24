import { ANDROID_PACKAGE } from "@/lib/app-mode";

/**
 * Digital Asset Links: proves to Android that the Play Store app and www.jobfitwise.se belong
 * together, so the app opens full-screen without a browser address bar.
 * Set ANDROID_CERT_SHA256 in Vercel to the SHA-256 fingerprint(s) from Play Console →
 * Test and release → App integrity → App signing (comma-separated: app signing key, upload key).
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const body = fingerprints.length
    ? [{
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
      }]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
