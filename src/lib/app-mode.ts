/**
 * "Android app mode": the Play Store app (a Trusted Web Activity) shows this website full-screen.
 * Google Play's payments policy doesn't allow buying digital subscriptions through our own Stripe
 * checkout inside the app, so in app mode every purchase button and upgrade link is hidden.
 * The app is recognised once, on launch (/app), and remembered in a cookie.
 */
export const APP_COOKIE = "fw_app";
export const ANDROID_PACKAGE = (process.env.ANDROID_PACKAGE_NAME ?? "se.jobfitwise.app").trim();

/** True when a request comes from the Android app: Chrome sends "android-app://<package>/" as referrer on launch. */
export function launchedFromAndroidApp(referrer: string | null, query: URLSearchParams): boolean {
  if (query.get("source") === "android") return true;
  return Boolean(referrer && referrer.startsWith(`android-app://${ANDROID_PACKAGE}`));
}

/** Server side: is this request from inside the Android app? */
export async function isAndroidApp(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  return (await cookies()).get(APP_COOKIE)?.value === "android";
}
