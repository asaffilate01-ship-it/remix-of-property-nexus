import { useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";

type Branch = { id: string; name: string; postcode: string; role: "Head office" | "Branch" };

const BRANCHES: Branch[] = [
  { id: "br-1", name: "Manchester — Deansgate (HQ)", postcode: "M3 3HF", role: "Head office" },
  { id: "br-2", name: "Didsbury", postcode: "M20 6RD", role: "Branch" },
  { id: "br-3", name: "Salford Quays", postcode: "M50 3SP", role: "Branch" },
  { id: "br-4", name: "Stockport", postcode: "SK1 3AZ", role: "Branch" },
];

export function BranchSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(BRANCHES[0]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-left hover:bg-muted/50 transition">
          <span className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><Building2 className="h-3.5 w-3.5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground leading-none">Branch</span>
            <span className="block text-sm font-medium truncate">{active.name}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search branches…" />
          <CommandList>
            <CommandEmpty>No branches</CommandEmpty>
            <CommandGroup heading="Your branches">
              {BRANCHES.map((b) => (
                <CommandItem key={b.id} onSelect={() => { setActive(b); setOpen(false); toast.success(`Switched to ${b.name}`); }}>
                  <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.role} · {b.postcode}</div>
                  </div>
                  {active.id === b.id && <Check className="h-4 w-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem onSelect={() => toast.info("Add branch flow")}><Plus className="h-3.5 w-3.5 mr-2" /> Add branch</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
