import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

/**
 * Public crawler policy. Authenticated areas are disallowed; the marketing
 * surface, pricing and pilot request are indexable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/request-pilot"],
        disallow: ["/portal", "/student", "/admin", "/auth", "/invite", "/design-system"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
