import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Camera, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getVisitContext, tokenStartVisit, tokenEndVisit, tokenRequestUploadUrl, tokenRecordMedia } from "@/lib/visits.functions";
import { watermarkImage, getBrowserLocation } from "@/lib/media-watermark";
import { SignaturePad } from "@/components/SignaturePad";
import exifr from "exifr";

export const Route = createFileRoute("/visit/$token")({
  head: () => ({ meta: [{ title: "Contractor visit — Estately" }, { name: "description", content: "Check in, capture evidence and complete your work order visit." }, { name: "robots", content: "noindex" }] }),
  component: VisitPage,
});

function VisitPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getVisitContext);
  const startFn = useServerFn(tokenStartVisit);
  const endFn = useServerFn(tokenEndVisit);
  const reqUpload = useServerFn(tokenRequestUploadUrl);
  const recordMedia = useServerFn(tokenRecordMedia);

  const { data, isLoading, error } = useQuery({
    queryKey: ["visit-ctx", token],
    queryFn: () => load({ data: { token } }),
    retry: false,
  });

  const [busy, setBusy] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [stage, setStage] = useState<"before" | "after">("before");
  const [counts, setCounts] = useState({ before: 0, after: 0 });
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !data) return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="max-w-md w-full"><CardContent className="p-6 text-center space-y-2">
        <div className="font-semibold">Link invalid or expired</div>
        <p className="text-sm text-muted-foreground">{(error as any)?.message ?? "Ask the agency to send a new link."}</p>
      </CardContent></Card>
    </div>
  );

  const wo = data.work_order as any;
  const prop = data.property as any;
  const active = data.visits?.find((v: any) => v.status === "checked_in");
  const activeVisitId = visitId ?? active?.id ?? null;

  const checkIn = async () => {
    setBusy(true);
    try {
      const pos = await getBrowserLocation();
      if (!pos) throw new Error("Enable location services and try again");
      const res = await startFn({ data: {
        token, latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy_m: pos.coords.accuracy,
        user_agent: navigator.userAgent.slice(0, 500),
      }});
      setVisitId(res.visit_id);
      toast.success("Checked in");
      qc.invalidateQueries({ queryKey: ["visit-ctx", token] });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const checkOut = async () => {
    if (!activeVisitId) return;
    setBusy(true);
    try {
      const pos = await getBrowserLocation();
      await endFn({ data: {
        token, visit_id: activeVisitId,
        latitude: pos?.coords.latitude ?? null,
        longitude: pos?.coords.longitude ?? null,
        accuracy_m: pos?.coords.accuracy ?? null,
        notes: notes || null,
        signature_data_url: signature,
      }});
      setDone(true);
      toast.success("Checked out — thanks!");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !activeVisitId) return;
    setBusy(true);
    try {
      const pos = await getBrowserLocation();
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        let lat = pos?.coords.latitude, lng = pos?.coords.longitude;
        const acc = pos?.coords.accuracy;
        let captured = new Date();
        let hasExifGps = false;
        if (!isVideo) {
          try {
            const exif: any = await exifr.parse(file, { gps: true, exif: true });
            if (exif?.latitude != null && exif?.longitude != null) {
              lat = exif.latitude; lng = exif.longitude; hasExifGps = true;
            }
            if (exif?.DateTimeOriginal) captured = new Date(exif.DateTimeOriginal);
          } catch { /* ignore */ }
        }
        let blob: Blob = file;
        let mime = file.type;
        let ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
        let hasOverlay = false;
        if (!isVideo) {
          blob = await watermarkImage(file, { lat, lng, when: captured });
          mime = "image/jpeg"; ext = "jpg"; hasOverlay = true;
        }
        const up = await reqUpload({ data: { token, visit_id: activeVisitId, ext } });
        const upRes = await supabase.storage.from("job-media").uploadToSignedUrl(up.path, up.token, blob, { contentType: mime });
        if (upRes.error) throw new Error(upRes.error.message);
        await recordMedia({ data: {
          token, visit_id: activeVisitId, stage, kind: isVideo ? "video" : "photo",
          storage_path: up.path, mime_type: mime, file_size: blob.size,
          captured_at: captured.toISOString(),
          latitude: lat ?? null, longitude: lng ?? null, accuracy_m: acc ?? null,
          has_exif_gps: hasExifGps, has_overlay: hasOverlay,
        }});
        setCounts((c) => ({ ...c, [stage]: c[stage] + 1 }));
      }
      toast.success("Uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  if (done) return (
    <div className="min-h-screen grid place-items-center p-6 bg-muted/30">
      <Card className="max-w-md w-full"><CardContent className="p-8 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600" />
        <div className="text-xl font-semibold">All done</div>
        <p className="text-sm text-muted-foreground">Your visit has been logged and the agency notified. You can close this page.</p>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Card><CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground">{data.agency?.name ?? "Agency"}</div>
          <h1 className="text-lg font-semibold">{wo?.title ?? "Work order"}</h1>
          {wo?.description && <p className="text-sm text-muted-foreground">{wo.description}</p>}
          {prop && <div className="text-sm flex items-start gap-1 mt-2"><MapPin className="h-3 w-3 mt-1 shrink-0" /><span>{[prop.address, prop.city, prop.postcode].filter(Boolean).join(", ") || prop.title}</span></div>}
          <div className="text-xs text-muted-foreground pt-2">Hi {data.contractor_name} — check in to begin.</div>
        </CardContent></Card>

        {!activeVisitId ? (
          <Button onClick={checkIn} disabled={busy} size="lg" className="w-full">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
            Check in (location required)
          </Button>
        ) : (
          <>
            <Card><CardContent className="p-4 space-y-3">
              <Badge className="bg-emerald-600 text-white">On site</Badge>
              <div className="flex gap-2">
                <Button type="button" variant={stage === "before" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setStage("before")}>Before ({counts.before})</Button>
                <Button type="button" variant={stage === "after" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setStage("after")}>After ({counts.after})</Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" capture="environment" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                Capture {stage} photo / video
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">Photos get a timestamp + GPS watermark burned in.</p>
            </CardContent></Card>

            <Card><CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs">Notes on completion</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done, parts used, follow-up needed..." />
              </div>
              <div>
                <Label className="text-xs">Signature</Label>
                <SignaturePad onChange={setSignature} />
              </div>
              <Button onClick={checkOut} disabled={busy} size="lg" className="w-full">
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                Check out
              </Button>
            </CardContent></Card>
          </>
        )}
      </div>
    </div>
  );
}
