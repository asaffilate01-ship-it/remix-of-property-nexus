import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, DoorOpen } from "lucide-react";

export type HmoRoom = {
  room_number: string;
  name?: string;
  rent_pcm?: number | null;
  en_suite?: boolean;
  bills_included?: boolean;
  available_from?: string | null;
};

type Props = {
  rooms: HmoRoom[];
  onChange: (next: HmoRoom[]) => void;
};

export function RoomsEditor({ rooms, onChange }: Props) {
  const update = (idx: number, patch: Partial<HmoRoom>) =>
    onChange(rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const add = () =>
    onChange([
      ...rooms,
      { room_number: String(rooms.length + 1), rent_pcm: null, en_suite: false, bills_included: true },
    ]);
  const remove = (idx: number) => onChange(rooms.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5"><DoorOpen className="h-4 w-4" /> Rooms ({rooms.length})</Label>
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> Add room</Button>
      </div>
      {rooms.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
          No rooms yet — add each lettable room with its number and rent.
        </div>
      )}
      {rooms.map((r, idx) => (
        <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3">
              <Label className="text-xs">Room #</Label>
              <Input value={r.room_number} onChange={(e) => update(idx, { room_number: e.target.value })} placeholder="1" />
            </div>
            <div className="col-span-5">
              <Label className="text-xs">Name (optional)</Label>
              <Input value={r.name ?? ""} onChange={(e) => update(idx, { name: e.target.value })} placeholder="Front double" />
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Rent £/mo</Label>
              <Input type="number" value={r.rent_pcm ?? ""} onChange={(e) => update(idx, { rent_pcm: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="col-span-1 flex items-end justify-end">
              <Button type="button" size="icon" variant="ghost" className="text-destructive h-9 w-9" onClick={() => remove(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Available from</Label>
              <Input type="date" value={r.available_from ?? ""} onChange={(e) => update(idx, { available_from: e.target.value || null })} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!r.en_suite} onCheckedChange={(v) => update(idx, { en_suite: v })} /> En-suite</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={r.bills_included ?? true} onCheckedChange={(v) => update(idx, { bills_included: v })} /> Bills</label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
