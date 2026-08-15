import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { signMediaUrl } from "@/lib/ops.functions";
import { ImageOff } from "lucide-react";

export function SignedMedia({
  path,
  kind,
  className,
}: {
  path: string;
  kind: "photo" | "video";
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const sign = useServerFn(signMediaUrl);
  const signRef = useRef(sign);
  signRef.current = sign;
  useEffect(() => {
    let alive = true;
    setUrl(null);
    setErr(false);
    signRef
      .current({ data: { path, expires: 600 } })
      .then((r) => {
        if (alive) setUrl(r.url);
      })
      .catch(() => {
        if (alive) setErr(true);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  if (err)
    return (
      <div className={`flex items-center justify-center bg-muted ${className || ""}`}>
        <ImageOff aria-hidden="true" className="h-6 w-6 opacity-50" />
      </div>
    );
  if (!url) return <div className={`bg-muted animate-pulse ${className || ""}`} />;
  if (kind === "video") return <video src={url} controls className={className} />;
  return <img src={url} alt="" className={className} loading="lazy" />;
}
