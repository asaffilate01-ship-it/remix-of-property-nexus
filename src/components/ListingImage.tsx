import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageOff } from "lucide-react";
import { signMediaUrl } from "@/lib/ops.functions";
import { extractListingPhotoPath } from "@/lib/listing-photos";

const SIGN_RETRY_DELAYS_MS = [0, 300, 900, 1800];

type Props = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
};

export function ListingImage({ src, alt = "", className, loading = "lazy" }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const sign = useServerFn(signMediaUrl);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!src) { setResolved(null); return; }
    const path = extractListingPhotoPath(src);
    if (!path) { setResolved(src); return; }
    setResolved(null);

    const signWithRetry = async () => {
      for (const delay of SIGN_RETRY_DELAYS_MS) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          const data = await sign({ data: { bucket: "listing-photos", path, expires: 3600 } });
          if (!alive) return;
          if (data?.url) {
            setResolved(data.url);
            return;
          }
        } catch {
          // retry
        }
        if (!alive) return;
      }
      if (alive) setFailed(true);
    };

    void signWithRetry();
    return () => { alive = false; };
  }, [sign, src]);

  if (!src || failed) {
    return <div className={`flex items-center justify-center bg-muted ${className || ""}`}><ImageOff className="h-6 w-6 opacity-50" /></div>;
  }
  if (!resolved) return <div className={`bg-muted animate-pulse ${className || ""}`} />;
  return <img src={resolved} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}
