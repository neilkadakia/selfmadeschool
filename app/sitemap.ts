import type { MetadataRoute } from "next";
import { ALL_UNITS } from "@/lib/curriculum";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/learn/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/about/`, changeFrequency: "monthly", priority: 0.8 },
    ...ALL_UNITS.map((u) => ({
      url: `${siteUrl}/learn/${u.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${siteUrl}/privacy/`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
