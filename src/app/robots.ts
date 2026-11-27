import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/payment-provider";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api/", "/go/", "/checkout/", "/payment/", "/login", "/register", "/search"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
