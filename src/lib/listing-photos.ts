const LISTING_PHOTO_SCHEME = "listing-photos://";

export function extractListingPhotoPath(url: string): string | null {
  try {
    if (url.startsWith(LISTING_PHOTO_SCHEME)) {
      return decodeURIComponent(url.slice(LISTING_PHOTO_SCHEME.length));
    }

    const match = url.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/listing-photos\/([^?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
    return null;
  } catch {
    return null;
  }
}

export function toListingPhotoRef(path: string): string {
  return `${LISTING_PHOTO_SCHEME}${encodeURIComponent(path)}`;
}