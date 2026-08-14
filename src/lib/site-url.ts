const FALLBACK_SITE_URL = "https://estate-elevate-hq.lovable.app";

export function normalizeSiteUrl(value: string | undefined): string {
  const candidate = value?.trim() || FALLBACK_SITE_URL;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return FALLBACK_SITE_URL;
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(import.meta.env?.VITE_SITE_URL);

export function siteUrl(path = "/"): string {
  const localPath = `/${path.replace(/^\/+/, "")}`;
  return new URL(localPath, `${SITE_URL}/`).toString();
}
