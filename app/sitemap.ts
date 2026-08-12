import type { MetadataRoute } from "next";
import { COURSES, courseUnits } from "@/lib/lms";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/learn/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/about/`, changeFrequency: "monthly", priority: 0.8 },
    ...COURSES.map((c) => ({
      url: `${siteUrl}/learn/${c.slug}/`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...COURSES.flatMap((c) =>
      courseUnits(c).map((u) => ({
        url: `${siteUrl}/learn/${c.slug}/${u.slug}/`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
    ),
    { url: `${siteUrl}/privacy/`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
