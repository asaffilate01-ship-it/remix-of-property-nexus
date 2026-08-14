import { normalizeSiteUrl } from "@/lib/site-url";

export function getServerSiteUrl(): string {
  return normalizeSiteUrl(process.env.APP_URL || process.env.VITE_SITE_URL);
}
