import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, BedDouble, Users, PoundSterling, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { IsoIcon } from "@/components/iso/IsoIcon";
import { fetchHmoData, saveRoom, saveTenancy, markRentPaid } from "@/lib/hmo.functions";

export const Route = createFileRoute("/_authenticated/hmo")({ component: HmoPage });

type Room = { id: string; property_id: string; name: string; rent_pcm: number | null; deposit: number | null; size_sqm: number | null; en_suite: boolean | null; bills_included: boolean | null; available_from: string | null; status: string; description: string | null };
type Property = { id: string; title: string; is_hmo: boolean | null; hmo_licence_number: string | null; hmo_licence_expires: string | null };
type Tenancy = { id: string; property_id: string; room_id: string | null; tenant_name: string; tenant_email: string | null; start_date: string; end_date: string | null; rent_amount: number; rent_frequency: "weekly" | "monthly"; status: string };
type Rent = { id: string; tenancy_id: string; due_date: string; amount: number; paid_amount: number | null; status: "due" | "paid" | "overdue" | "waived" };

const ROOM_STATUSES = ["available", "reserved", "let", "notice"] as const;

function HmoPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchHmoData);
  const saveR = useServerFn(saveRoom);
  const saveT = useServerFn(saveTenancy);
  const payRent = useServerFn(markRentPaid);
  const { data, isLoading } = useQuery({ queryKey: ["hmo"], queryFn: () => load() });

  const [roomOpen, setRoomOpen] = useState(false);
  const [tenancyOpen, setTenancyOpen] = useState(false);
  const [room, setRoom] = useState({ property_id: "", name: "", rent_pcm: "", deposit: "", size_sqm: "", en_suite: false, bills_included: true, available_from: "", status: "available", description: "" });
  const [ten, setTen] = useState({ property_id: "", room_id: "", tenant_name: "", tenant_email: "", tenant_phone: "", start_date: new Date().toISOString().slice(0, 10), rent_amount: "", rent_frequency: "monthly" as "weekly" | "monthly", deposit: "", deposit_scheme: "DPS", deposit_reference: "", months: "12", generate_schedule: true });

  const properties = (data?.properties ?? []) as Property[];
  const rooms = (data?.rooms ?? []) as Room[];
  const tenancies = (data?.tenancies ?? []) as Tenancy[];
  const rent = (data?.rent ?? []) as Rent[];

  const hmoProps = properties.filter((p) => p.is_hmo);
  const propLabel = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p.title])), [properties]);
  const roomLabel = useMemo(() => Object.fromEntries(rooms.map((r) => [r.id, r.name])), [rooms]);

  const byStatus = (s: string) => rooms.filter((r) => r.status === s);

  const arrears = rent.filter((r) => r.status !== "paid" && new Date(r.due_date) < new Date());
  const collected = rent.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.paid_amount ?? 0), 0);

  const submitRoom = async () => {
    try {
      await saveR({ data: {
        property_id: room.property_id, name: room.name,
        rent_pcm: room.rent_pcm ? Number(room.rent_pcm) : null,
        deposit: room.deposit ? Number(room.deposit) : null,
        size_sqm: room.size_sqm ? Number(room.size_sqm) : null,
        en_suite: room.en_suite, bills_included: room.bills_included,
        available_from: room.available_from || null,
        status: room.status, description: room.description || null,
      } });
      toast.success("Room saved");
      setRoomOpen(false);
      qc.invalidateQueries({ queryKey: ["hmo"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const submitTenancy = async () => {
    try {
      await saveT({ data: {
        property_id: ten.property_id, room_id: ten.room_id || null,
        tenant_name: ten.tenant_name, tenant_email: ten.tenant_email || null, tenant_phone: ten.tenant_phone || null,
        start_date: ten.start_date, rent_amount: Number(ten.rent_amount), rent_frequency: ten.rent_frequency,
        deposit: ten.deposit ? Number(ten.deposit) : 0, deposit_scheme: ten.deposit_scheme || null, deposit_reference: ten.deposit_reference || null,
        status: "active", generate_schedule: ten.generate_schedule, months: Number(ten.months || "12"),
      } });
      toast.success("Tenancy created");
      setTenancyOpen(false);
      qc.invalidateQueries({ queryKey: ["hmo"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const markPaid = async (r: Rent) => {
    await payRent({ data: { id: r.id, paid_amount: Number(r.amount) } });
    qc.invalidateQueries({ queryKey: ["hmo"] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between sm:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <IsoIcon name="hmo" size={56} className="shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">HMO workspace</h1>
            <p className="text-muted-foreground text-sm">Rooms, tenancies and rent — purpose-built for house shares.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
            <DialogTrigger asChild><Button variant="outline" disabled={hmoProps.length === 0}><Plus className="mr-2 h-4 w-4" /> Room</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New room</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>HMO property</Label>
                  <Select value={room.property_id} onValueChange={(v) => setRoom({ ...room, property_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>{hmoProps.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name</Label><Input value={room.name} onChange={(e) => setRoom({ ...room, name: e.target.value })} placeholder="Room 1" /></div>
                  <div><Label>Status</Label>
                    <Select value={room.status} onValueChange={(v) => setRoom({ ...room, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ROOM_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Rent pcm</Label><Input type="number" value={room.rent_pcm} onChange={(e) => setRoom({ ...room, rent_pcm: e.target.value })} /></div>
                  <div><Label>Deposit</Label><Input type="number" value={room.deposit} onChange={(e) => setRoom({ ...room, deposit: e.target.value })} /></div>
                  <div><Label>Size (m²)</Label><Input type="number" value={room.size_sqm} onChange={(e) => setRoom({ ...room, size_sqm: e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={room.en_suite} onCheckedChange={(v) => setRoom({ ...room, en_suite: v })} /> En-suite</label>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={room.bills_included} onCheckedChange={(v) => setRoom({ ...room, bills_included: v })} /> Bills included</label>
                </div>
                <div><Label>Available from</Label><Input type="date" value={room.available_from} onChange={(e) => setRoom({ ...room, available_from: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea rows={2} value={room.description} onChange={(e) => setRoom({ ...room, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={submitRoom} disabled={!room.property_id || !room.name}>Save room</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={tenancyOpen} onOpenChange={setTenancyOpen}>
            <DialogTrigger asChild><Button disabled={properties.length === 0}><Plus className="mr-2 h-4 w-4" /> Tenancy</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New tenancy</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Property</Label>
                  <Select value={ten.property_id} onValueChange={(v) => setTen({ ...ten, property_id: v, room_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {ten.property_id && rooms.some((r) => r.property_id === ten.property_id) && (
                  <div><Label>Room (optional)</Label>
                    <Select value={ten.room_id} onValueChange={(v) => setTen({ ...ten, room_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Whole property" /></SelectTrigger>
                      <SelectContent>{rooms.filter((r) => r.property_id === ten.property_id).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tenant name</Label><Input value={ten.tenant_name} onChange={(e) => setTen({ ...ten, tenant_name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input value={ten.tenant_email} onChange={(e) => setTen({ ...ten, tenant_email: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start date</Label><Input type="date" value={ten.start_date} onChange={(e) => setTen({ ...ten, start_date: e.target.value })} /></div>
                  <div><Label>Months</Label><Input type="number" value={ten.months} onChange={(e) => setTen({ ...ten, months: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Rent</Label><Input type="number" value={ten.rent_amount} onChange={(e) => setTen({ ...ten, rent_amount: e.target.value })} /></div>
                  <div><Label>Frequency</Label>
                    <Select value={ten.rent_frequency} onValueChange={(v) => setTen({ ...ten, rent_frequency: v as "weekly" | "monthly" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Deposit</Label><Input type="number" value={ten.deposit} onChange={(e) => setTen({ ...ten, deposit: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Deposit scheme</Label>
                    <Select value={ten.deposit_scheme} onValueChange={(v) => setTen({ ...ten, deposit_scheme: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="DPS">DPS</SelectItem><SelectItem value="MyDeposits">MyDeposits</SelectItem><SelectItem value="TDS">TDS</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Scheme reference</Label><Input value={ten.deposit_reference} onChange={(e) => setTen({ ...ten, deposit_reference: e.target.value })} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm"><Switch checked={ten.generate_schedule} onCheckedChange={(v) => setTen({ ...ten, generate_schedule: v })} /> Auto-generate rent schedule</label>
              </div>
              <DialogFooter><Button onClick={submitTenancy} disabled={!ten.property_id || !ten.tenant_name || !ten.rent_amount}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<BedDouble className="h-4 w-4 text-muted-foreground" />} label="Rooms" value={rooms.length} />
        <StatCard icon={<Users className="h-4 w-4 text-muted-foreground" />} label="Active tenancies" value={tenancies.filter((t) => t.status === "active").length} />
        <StatCard icon={<PoundSterling className="h-4 w-4 text-success" />} label="Collected" value={`£${collected.toLocaleString()}`} />
        <StatCard icon={<PoundSterling className="h-4 w-4 text-destructive" />} label="In arrears" value={arrears.length} />
      </div>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="tenancies">Tenancies</TabsTrigger>
          <TabsTrigger value="rent">Rent ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="h-5 w-20 bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <EmptyState text={hmoProps.length === 0 ? "Mark a property as HMO to start adding rooms." : "Add your first room to begin."} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {ROOM_STATUSES.map((s) => (
                <Card key={s} className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold capitalize">{s}</div>
                      <Badge variant="secondary">{byStatus(s).length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {byStatus(s).map((r) => (
                        <div key={r.id} className="rounded-lg border p-3">
                          <div className="text-sm font-medium truncate">{r.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{propLabel[r.property_id]}</div>
                          <div className="flex items-center justify-between mt-1 text-xs">
                            <span>£{Number(r.rent_pcm ?? 0).toLocaleString()} pcm</span>
                            <span>{r.size_sqm ? `${r.size_sqm} m²` : ""}{r.en_suite ? " · en-suite" : ""}</span>
                          </div>
                        </div>
                      ))}
                      {byStatus(s).length === 0 && <div className="text-xs text-muted-foreground italic">None</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tenancies" className="mt-4">
          {tenancies.length === 0 ? <EmptyState text="Create your first tenancy." /> : (
            <Card className="border-0 shadow-card">
              <CardContent className="p-0">
                <div className="divide-y">
                  {tenancies.map((t) => (
                    <div key={t.id} className="p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex sm:items-center sm:gap-6">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.tenant_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {propLabel[t.property_id]}{t.room_id ? ` · ${roomLabel[t.room_id]}` : ""} · from {new Date(t.start_date).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium">£{Number(t.rent_amount).toLocaleString()}/{t.rent_frequency === "weekly" ? "wk" : "mo"}</span>
                        <Badge variant={t.status === "active" ? "default" : "secondary"} className="capitalize">{t.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rent" className="mt-4">
          {rent.length === 0 ? <EmptyState text="No rent scheduled yet. Create a tenancy and auto-generate its schedule." /> : (
            <Card className="border-0 shadow-card">
              <CardContent className="p-0">
                <div className="divide-y">
                  {rent.slice(0, 50).map((r) => {
                    const overdue = r.status !== "paid" && new Date(r.due_date) < new Date();
                    const tenant = tenancies.find((t) => t.id === r.tenancy_id)?.tenant_name ?? "—";
                    return (
                      <div key={r.id} className="p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex sm:items-center sm:gap-6">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{tenant}</div>
                          <div className="text-xs text-muted-foreground">Due {new Date(r.due_date).toLocaleDateString("en-GB")}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-sm font-medium">£{Number(r.amount).toLocaleString()}</div>
                          {r.status === "paid" ? (
                            <Badge className="bg-success text-success-foreground">Paid</Badge>
                          ) : overdue ? (
                            <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>
                          ) : (
                            <Badge variant="secondary">Due</Badge>
                          )}
                          {r.status !== "paid" && (
                            <Button size="sm" variant="outline" onClick={() => markPaid(r)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark paid
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}<span>{label}</span></div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed border-2 bg-transparent">
      <CardContent className="p-12 text-center">
        <IsoIcon name="hmo" size={80} className="mx-auto opacity-70 mb-3" />
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
