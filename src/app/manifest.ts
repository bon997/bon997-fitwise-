import type { MetadataRoute } from "next";

/**
 * Web app manifest: makes the site installable and is what the Android app (a Trusted Web
 * Activity built with PWABuilder/Bubblewrap) reads for its name, icons and colours.
 * start_url is /app, which notices the Android app and then opens the dashboard.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "JobFitwise — AI job matching",
    short_name: "JobFitwise",
    description: "Upload your CV once. JobFitwise scores every job against your skills, shows what's missing and helps you apply, prepare for interviews and plan your career.",
    lang: "sv",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f3ee",
    theme_color: "#1d6b52",
    categories: ["business", "productivity", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Jobs", short_name: "Jobs", url: "/jobs", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "My applications", short_name: "Applications", url: "/applications", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
