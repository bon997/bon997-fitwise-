import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobFitwise — AI job matching",
    short_name: "JobFitwise",
    description: "Upload your resume once. JobFitwise scores every job against your skills and drafts the cover letter.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f3ee",
    theme_color: "#1d6b52",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
