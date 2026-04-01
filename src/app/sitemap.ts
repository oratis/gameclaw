import type { MetadataRoute } from "next";
import { GAME_SLUGS } from "@/lib/hoyolab/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://gogameclaw.com";

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
    { url: `${baseUrl}/games`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/docs/skill`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/docs/api`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/signin`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const gamePages = GAME_SLUGS.map((slug) => ({
    url: `${baseUrl}/games/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...gamePages];
}
