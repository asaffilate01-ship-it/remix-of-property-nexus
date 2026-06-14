import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Lock, Wrench, Sparkles, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { fetchHolidayData, saveBooking, deleteBooking, saveBlock } from "@/lib/holiday.functions";

export const Route = createFileRoute("/_authenticated/holiday-lets")({ component: HolidayPage });

const DAY_W = 36;
const ROW_H = 64;

function HolidayPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchHolidayData);
  const saveBk = useServerFn(saveBooking);
  const delBk = useServerFn(deleteBooking);
  const saveBl = useServerFn(saveBlock);
  const { data, isLoading } = useQuery({ queryKey: ["holiday"], queryFn: () => load() });

  const [monthOffset, setMonthOffset] = useState(0);
  const [bk, setBk] = useState<any | null>(null);
  const [bl, setBl] = useState<any | null>(null);

  const start = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const end = useMemo(() => { const d = new Date(start); d.setMonth(d.getMonth() + 2); return d; }, [start]);
  const days = useMemo(() => {
    const n = Math.round((end.getTime() - start.getTime()) / 86400000);
    return Array.from({ length: n }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  }, [start, end]);

  const xFor = (d: string | Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return ((date.getTime() - start.getTime()) / 86400000) * DAY_W;
  };

  const properties = data?.properties ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Holiday lets"
        description="Bookings, owner blocks, maintenance and turnover schedule"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setMonthOffset(monthOffset - 1)}>‹</Button>
            <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => setMonthOffset(monthOffset + 1)}>›</Button>
            <Button size="sm" onClick={() => setBk({})}><Plus className="h-3 w-3 mr-1" /> New booking</Button>
            <Button size="sm" variant="outline" onClick={() => setBl({})}><Lock className="h-3 w-3 mr-1" /> Block dates</Button>
          </div>
        }
      />

      <div className="flex gap-3 text-xs">
        <Badge style={{ background: "hsl(220 80% 55%)", color: "white" }}>Booking</Badge>
        <Badge style={{ background: "hsl(140 60% 40%)", color: "white" }}><Sparkles className="h-3 w-3 mr-1 inline" /> Cleaning</Badge>
        <Badge style={{ background: "hsl(40 90% 50%)", color: "white" }}>Owner</Badge>
        <Badge style={{ background: "hsl(0 70% 50%)", color: "white" }}><Wrench className="h-3 w-3 mr-1 inline" /> Maintenance</Badge>
      </div>

      <Card className="border-0 shadow-card overflow-hidden">
        <CardContent className="p-0">
          {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && properties.length === 0 && <div className="p-12 text-sm text-muted-foreground text-center border-dashed">Add a property first</div>}
          {properties.length > 0 && (
            <div className="overflow-x-auto">
              <div style={{ minWidth: 240 + days.length * DAY_W }}>
                {/* header */}
                <div className="flex border-b sticky top-0 bg-card z-10">
                  <div className="w-60 shrink-0 px-3 py-2 text-xs font-semibold border-r">Property</div>
                  <div className="flex">
                    {days.map((d, i) => {
                      const isFirst = d.getDate() === 1;
                      const isMon = d.getDay() === 1;
                      return (
                        <div key={i} style={{ width: DAY_W }} className={`text-[10px] text-center py-1 border-r ${isMon ? "bg-muted/30" : ""}`}>
                          {isFirst && <div className="font-bold">{d.toLocaleDateString("en-GB", { month: "short" })}</div>}
                          <div>{d.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* rows */}
                {properties.map((p: any) => {
                  const pBookings = (data?.bookings ?? []).filter((b: any) => b.property_id === p.id);
                  const pBlocks = (data?.blocks ?? []).filter((b: any) => b.property_id === p.id);
                  const pCleans = (data?.cleaning ?? []).filter((c: any) => c.property_id === p.id);
                  return (
                    <div key={p.id} className="flex border-b" style={{ height: ROW_H }}>
                      <div className="w-60 shrink-0 px-3 py-2 border-r text-sm">
                        <div className="font-medium truncate">{p.title || p.address}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.city}</div>
                      </div>
                      <div className="relative flex-1" style={{ minWidth: days.length * DAY_W }}>
                        {pBookings.map((b: any) => {
                          const x = xFor(b.check_in);
                          const w = (xFor(b.check_out) - x) || DAY_W;
                          if (x + w < 0 || x > days.length * DAY_W) return null;
                          return (
                            <button key={b.id} onClick={() => setBk(b)}
                              className="absolute rounded-md px-2 text-[11px] text-white font-medium truncate hover:ring-2 ring-white/40"
                              style={{ left: x, width: w - 2, top: 8, height: 22, background: b.status === "cancelled" ? "hsl(0 0% 50%)" : "hsl(220 80% 55%)" }}>
                              {b.guest_name}
                            </button>
                          );
                        })}
                        {pBlocks.map((b: any) => {
                          const x = xFor(b.start_date);
                          const w = ((xFor(b.end_date) - x) || DAY_W) + DAY_W;
                          if (x + w < 0 || x > days.length * DAY_W) return null;
                          const color = b.kind === "owner" ? "hsl(40 90% 50%)" : b.kind === "maintenance" ? "hsl(0 70% 50%)" : "hsl(280 50% 50%)";
                          return (
                            <button key={b.id} onClick={() => setBl(b)}
                              className="absolute rounded-md px-2 text-[11px] text-white font-medium truncate hover:ring-2 ring-white/40"
                              style={{ left: x, width: w - 2, top: 32, height: 18, background: color }}>
                              {b.kind === "owner" ? "Owner use" : b.kind === "maintenance" ? "Maintenance" : "Blocked"}
                            </button>
                          );
                        })}
                        {pCleans.map((c: any) => {
                          const x = xFor(c.scheduled_at);
                          if (x < 0 || x > days.length * DAY_W) return null;
                          return (
                            <div key={c.id} title={`Clean ${new Date(c.scheduled_at).toLocaleString("en-GB")}`}
                              className="absolute rounded text-[10px] text-white px-1 truncate"
                              style={{ left: x, width: DAY_W - 2, top: 52, height: 12, background: "hsl(140 60% 40%)" }}>
                              ✓
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking dialog */}
      <Dialog open={!!bk} onOpenChange={(v) => { if (!v) setBk(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{bk?.id ? "Edit booking" : "New booking"}</DialogTitle></DialogHeader>
          {bk && (
            <div className="space-y-3">
              <div>
                <Label>Property</Label>
                <Select value={bk.property_id ?? ""} onValueChange={(v) => setBk({ ...bk, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title || p.address}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Check-in</Label><Input type="date" value={bk.check_in ?? ""} onChange={(e) => setBk({ ...bk, check_in: e.target.value })} /></div>
                <div><Label>Check-out</Label><Input type="date" value={bk.check_out ?? ""} onChange={(e) => setBk({ ...bk, check_out: e.target.value })} /></div>
              </div>
              <div><Label>Guest name</Label><Input value={bk.guest_name ?? ""} onChange={(e) => setBk({ ...bk, guest_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Email</Label><Input type="email" value={bk.guest_email ?? ""} onChange={(e) => setBk({ ...bk, guest_email: e.target.value })} /></div>
                <div><Label>Guests</Label><Input type="number" min={1} value={bk.guests_count ?? 1} onChange={(e) => setBk({ ...bk, guests_count: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Total (£)</Label><Input type="number" value={bk.total ?? ""} onChange={(e) => setBk({ ...bk, total: Number(e.target.value) })} /></div>
                <div><Label>Cleaning fee (£)</Label><Input type="number" value={bk.cleaning_fee ?? ""} onChange={(e) => setBk({ ...bk, cleaning_fee: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={bk.status ?? "confirmed"} onValueChange={(v) => setBk({ ...bk, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["enquiry","provisional","confirmed","checked_in","checked_out","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea rows={2} placeholder="Notes" value={bk.notes ?? ""} onChange={(e) => setBk({ ...bk, notes: e.target.value })} />
            </div>
          )}
          <DialogFooter className="gap-2">
            {bk?.id && <Button variant="destructive" onClick={async () => { await delBk({ data: { id: bk.id } }); setBk(null); qc.invalidateQueries({ queryKey: ["holiday"] }); toast.success("Deleted"); }}>Delete</Button>}
            <Button onClick={async () => {
              try {
                await saveBk({ data: bk });
                setBk(null);
                qc.invalidateQueries({ queryKey: ["holiday"] });
                toast.success("Saved");
              } catch (e: any) { toast.error(e.message); }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block dialog */}
      <Dialog open={!!bl} onOpenChange={(v) => { if (!v) setBl(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle><CalendarRange className="h-4 w-4 inline mr-1" /> Block dates</DialogTitle></DialogHeader>
          {bl && (
            <div className="space-y-3">
              <div>
                <Label>Property</Label>
                <Select value={bl.property_id ?? ""} onValueChange={(v) => setBl({ ...bl, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title || p.address}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={bl.kind ?? "owner"} onValueChange={(v) => setBl({ ...bl, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start</Label><Input type="date" value={bl.start_date ?? ""} onChange={(e) => setBl({ ...bl, start_date: e.target.value })} /></div>
                <div><Label>End</Label><Input type="date" value={bl.end_date ?? ""} onChange={(e) => setBl({ ...bl, end_date: e.target.value })} /></div>
              </div>
              <Textarea rows={2} placeholder="Notes" value={bl.notes ?? ""} onChange={(e) => setBl({ ...bl, notes: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button onClick={async () => {
              try { await saveBl({ data: bl }); setBl(null); qc.invalidateQueries({ queryKey: ["holiday"] }); toast.success("Saved"); }
              catch (e: any) { toast.error(e.message); }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
