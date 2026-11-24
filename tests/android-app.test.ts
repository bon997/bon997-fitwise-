import { afterEach, describe, expect, it, vi } from "vitest";
import { launchedFromAndroidApp } from "@/lib/app-mode";
import { GET as assetlinks } from "@/app/.well-known/assetlinks.json/route";
import { GET as appStart } from "@/app/app/route";
import manifest from "@/app/manifest";

afterEach(() => vi.unstubAllEnvs());

describe("Android app (Trusted Web Activity)", () => {
  it("recognises a launch from the Play Store app", () => {
    expect(launchedFromAndroidApp("android-app://se.jobfitwise.app/", new URLSearchParams())).toBe(true);
    expect(launchedFromAndroidApp("android-app://com.other.app/", new URLSearchParams())).toBe(false);
    expect(launchedFromAndroidApp("https://www.google.com/", new URLSearchParams())).toBe(false);
    expect(launchedFromAndroidApp(null, new URLSearchParams("source=android"))).toBe(true);
  });

  it("/app remembers the Android app and opens the dashboard", () => {
    const res = appStart(new Request("https://www.jobfitwise.se/app", { headers: { referer: "android-app://se.jobfitwise.app/" } }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://www.jobfitwise.se/dashboard");
    expect(res.headers.get("set-cookie")).toMatch(/fw_app=android/);
    const web = appStart(new Request("https://www.jobfitwise.se/app"));
    expect(web.headers.get("set-cookie")).toBeNull();
  });

  it("serves Digital Asset Links from the fingerprints in the environment", async () => {
    expect(await assetlinks().json()).toEqual([]);
    vi.stubEnv("ANDROID_CERT_SHA256", "aa:bb , CC:DD");
    const [link] = await assetlinks().json();
    expect(link.target).toEqual({ namespace: "android_app", package_name: "se.jobfitwise.app", sha256_cert_fingerprints: ["AA:BB", "CC:DD"] });
    expect(link.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
  });

  it("has an installable manifest with maskable icons", () => {
    const m = manifest();
    expect(m.start_url).toBe("/app");
    expect(m.display).toBe("standalone");
    expect(m.icons?.some((i) => i.purpose === "maskable" && i.sizes === "512x512")).toBe(true);
  });
});
