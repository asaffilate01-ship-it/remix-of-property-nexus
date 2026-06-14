import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageOff } from "lucide-react";

// Extracts the object path if the URL is a Supabase signed/public URL
// for the listing-photos bucket. Returns null otherwise.
function extractListingPhotoPath(url: string): string | null {
  try {
    if (url.startsWith("listing-photos://")) return decodeURIComponent(url.slice("listing-photos://".length));
    const m = url.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/listing-photos\/([^?#]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    return null;
  } catch {
    return null;
  }
}

type Props = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
};

export function ListingImage({ src, alt = "", className, loading = "lazy" }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!src) { setResolved(null); return; }
    const path = extractListingPhotoPath(src);
    if (!path) { setResolved(src); return; }
    // Re-sign so expired tokens from previous sessions don't break previews.
    supabase.storage.from("listing-photos").createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data?.signedUrl) { setResolved(src); return; }
        setResolved(data.signedUrl);
      })
      .catch(() => { if (alive) setResolved(src); });
    return () => { alive = false; };
  }, [src]);

  if (!src || failed) {
    return <div className={`flex items-center justify-center bg-muted ${className || ""}`}><ImageOff className="h-6 w-6 opacity-50" /></div>;
  }
  if (!resolved) return <div className={`bg-muted animate-pulse ${className || ""}`} />;
  return <img src={resolved} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}
