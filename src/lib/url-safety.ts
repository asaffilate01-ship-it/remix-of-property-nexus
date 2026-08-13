/**
 * Returns an absolute web URL only when it is safe to place in href/src.
 * Database-backed URLs are untrusted input; executable schemes must never
 * reach the DOM.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Allow only same-site, root-relative post-auth destinations. */
export function safeLocalRedirect(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if ([...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  }) || value.includes("\\")) return fallback;
  return value;
}
