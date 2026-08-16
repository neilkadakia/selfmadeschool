import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

// /learn pages are omitted while the LMS is invite-only (they're also
// noindexed and disallowed in robots.txt). Restore them at public launch.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/demo/lesson/`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/about/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/privacy/`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms/`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
