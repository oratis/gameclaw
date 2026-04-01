import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/accounts", "/checkin", "/profile"],
      },
    ],
    sitemap: "https://gogameclaw.com/sitemap.xml",
  };
}
