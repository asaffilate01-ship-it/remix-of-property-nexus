import { useRef, useState } from "react";
import { Camera, Video, Upload, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getGeo, uploadCapture } from "@/lib/survey";

type Props = {
  userId: string;
  folderId?: string | null;
  propertyId?: string | null;
  workOrderId?: string | null;
  agencyId?: string | null;
  onUploaded?: () => void;
  label?: string;
};

export function CaptureButton({ userId, onUploaded, label = "Capture", ...links }: Props) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    const geo = await getGeo();
    if (geo.lat !== null) toast.success(`Location pinned (±${Math.round(geo.accuracy_m ?? 0)}m)`, { icon: <MapPin className="h-4 w-4" /> });
    let ok = 0, fail = 0;
    for (const f of Array.from(files)) {
      try { await uploadCapture({ file: f, userId, geo, ...links }); ok++; }
      catch (e) { console.error(e); fail++; }
    }
    setBusy(false);
    if (ok) toast.success(`${ok} ${ok === 1 ? "capture" : "captures"} saved`);
    if (fail) toast.error(`${fail} upload${fail === 1 ? "" : "s"} failed`);
    onUploaded?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {busy ? "Uploading…" : label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => photoRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" /> Take photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => videoRef.current?.click()}>
            <Video className="h-4 w-4 mr-2" /> Record video
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Upload from device
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handle(e.target.files)} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => handle(e.target.files)} />
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => handle(e.target.files)} />
    </>
  );
}
