import type { MetadataRoute } from "next";
import { siteUrl } from "@/components/seo/JsonLd";
import { sql } from "@/lib/db";

// Rebuilt at most once an hour so new jobs show up without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const jobs = await sql<{ id: string; updated_at: Date }>(
      "SELECT id, updated_at FROM jobs WHERE is_active ORDER BY posted_at DESC NULLS LAST LIMIT 5000",
    );
    return [...pages, ...jobs.map((j) => ({ url: `${base}/jobs/${j.id}`, lastModified: j.updated_at, changeFrequency: "weekly" as const, priority: 0.7 }))];
  } catch {
    // No database at build time: the static pages are still worth listing.
    return pages;
  }
}
