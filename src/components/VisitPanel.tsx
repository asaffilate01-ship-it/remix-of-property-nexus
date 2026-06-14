import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut, MapPin, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startVisit, endVisit } from "@/lib/visits.functions";
import { GeoMediaUpload } from "@/components/GeoMediaUpload";
import { SignaturePad } from "@/components/SignaturePad";

type Visit = {
  id: string;
  status: string;
  check_in_at: string;
  check_out_at: string | null;
  check_in_distance_m: number | null;
  duration_minutes: number | null;
  worker_name: string | null;
  notes: string | null;
};

function getPos(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 10_000 },
    );
  });
}

export function VisitPanel({
  workOrderId,
  propertyId,
  visits,
  media,
  invalidateKey = ["ops"],
}: {
  workOrderId: string;
  propertyId: string | null;
  visits: Visit[];
  media: any[];
  invalidateKey?: any[];
}) {
  const qc = useQueryClient();
  const start = useServerFn(startVisit);
  const end = useServerFn(endVisit);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [markCompleted, setMarkCompleted] = useState(false);

  const active = useMemo(() => visits.find((v) => v.status === "checked_in") ?? null, [visits]);
  const history = useMemo(() => visits.filter((v) => v !== active), [visits, active]);
  const beforeMedia = media.filter((m) => m.stage === "before");
  const afterMedia = media.filter((m) => m.stage === "after");

  const doCheckIn = async () => {
    setBusy(true);
    try {
      const pos = await getPos();
      if (!pos) throw new Error("Enable location to check in");
      await start({ data: {
        work_order_id: workOrderId,
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
      }});
      toast.success("Checked in");
      qc.invalidateQueries({ queryKey: invalidateKey });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const doCheckOut = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const pos = await getPos();
      await end({ data: {
        visit_id: active.id,
        latitude: pos?.coords.latitude ?? null,
        longitude: pos?.coords.longitude ?? null,
        accuracy_m: pos?.coords.accuracy ?? null,
        notes: notes || null,
        signature_data_url: signature,
        mark_completed: markCompleted,
      }});
      toast.success("Checked out");
      setNotes(""); setSignature(null); setMarkCompleted(false);
      qc.invalidateQueries({ queryKey: invalidateKey });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {active ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-emerald-600 text-white">On site</Badge>
              <span className="text-muted-foreground">since {new Date(active.check_in_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              {active.check_in_distance_m != null && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{Math.round(active.check_in_distance_m)}m from property</span>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Before photos / video</Label>
              <div className="mt-1"><GeoMediaUpload workOrderId={workOrderId} propertyId={propertyId} visitId={active.id} stage="before" label="Add before" onUploaded={() => qc.invalidateQueries({ queryKey: invalidateKey })} /></div>
              <div className="text-[10px] text-muted-foreground mt-1">{beforeMedia.length} captured</div>
            </div>
            <div>
              <Label className="text-xs">After photos / video</Label>
              <div className="mt-1"><GeoMediaUpload workOrderId={workOrderId} propertyId={propertyId} visitId={active.id} stage="after" label="Add after" onUploaded={() => qc.invalidateQueries({ queryKey: invalidateKey })} /></div>
              <div className="text-[10px] text-muted-foreground mt-1">{afterMedia.length} captured</div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes on completion</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done, parts used, follow-up needed..." />
          </div>
          <div>
            <Label className="text-xs">Signature</Label>
            <SignaturePad onChange={setSignature} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markCompleted} onChange={(e) => setMarkCompleted(e.target.checked)} />
            Mark job as completed
          </label>
          <Button onClick={doCheckOut} disabled={busy} variant="default" className="w-full">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />} Check out
          </Button>
        </div>
      ) : (
        <Button onClick={doCheckIn} disabled={busy} size="lg" className="w-full">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />} Check in (location required)
        </Button>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Past visits</div>
          {history.map((v) => (
            <div key={v.id} className="text-sm flex items-center justify-between gap-2 border-l-2 border-muted pl-2 py-1">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{v.worker_name ?? "Worker"}</span>
                  {v.duration_minutes != null && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{v.duration_minutes}m</span>}
                </div>
                {v.notes && <div className="text-xs text-muted-foreground mt-0.5">{v.notes}</div>}
              </div>
              <div className="text-[10px] text-muted-foreground text-right">{new Date(v.check_in_at).toLocaleString("en-GB")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
