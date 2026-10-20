import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The API, sign-in and the learner's own pages have nothing for search engines.
      disallow: ["/api/", "/admin", "/logg-inn", "/registrer", "/oversikt", "/trening/feil", "/trening/ord"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
