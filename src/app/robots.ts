import type { MetadataRoute } from "next";
import { siteUrl } from "@/components/seo/JsonLd";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in and internal pages have nothing for search engines.
      disallow: ["/api/", "/admin", "/dashboard", "/profile", "/onboarding", "/activity-report", "/reset-password", "/verify-email", "/unsubscribe"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
