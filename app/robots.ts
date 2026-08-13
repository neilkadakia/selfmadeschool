import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // /learn is invite-only while the LMS is in closed session.
    rules: { userAgent: "*", allow: "/", disallow: ["/learn/", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
