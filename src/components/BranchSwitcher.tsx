import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Building2, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { listBranches } from "@/lib/branches.functions";

type Branch = { id: string; name: string; postcode: string | null; is_primary: boolean };

const STORAGE_KEY = "gabley:active-branch";

export function BranchSwitcher() {
  const fetchBranches = useServerFn(listBranches);
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [active, setActive] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches({})
      .then((r) => {
        const list = (r.branches ?? []) as Branch[];
        setBranches(list);
        const savedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        const initial = list.find((b) => b.id === savedId) ?? list.find((b) => b.is_primary) ?? list[0] ?? null;
        setActive(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchBranches]);

  const pick = (b: Branch) => {
    setActive(b);
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, b.id); } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent("gabley:branch-changed", { detail: b.id }));
    toast.success(`Switched to ${b.name}`);
  };

  if (loading) {
    return (
      <button disabled className="w-full flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-left opacity-70">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading branches…</span>
      </button>
    );
  }

  if (branches.length === 0) {
    return (
      <Link to="/branches" className="w-full flex items-center gap-2 rounded-md border border-dashed bg-background px-2.5 py-2 text-left hover:bg-muted/50 transition">
        <span className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><Plus className="h-3.5 w-3.5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground leading-none">No branches yet</span>
          <span className="block text-sm font-medium truncate">Add your first branch</span>
        </span>
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-left hover:bg-muted/50 transition">
          <span className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><Building2 className="h-3.5 w-3.5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground leading-none">Branch</span>
            <span className="block text-sm font-medium truncate">{active?.name ?? "Select a branch"}</span>
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
              {branches.map((b) => (
                <CommandItem key={b.id} onSelect={() => pick(b)}>
                  <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.is_primary ? "Head office" : "Branch"}{b.postcode ? ` · ${b.postcode}` : ""}</div>
                  </div>
                  {active?.id === b.id && <Check className="h-4 w-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem asChild>
                <Link to="/branches" className="cursor-pointer"><Plus className="h-3.5 w-3.5 mr-2" /> Manage branches</Link>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function useActiveBranchId(): string | null {
  const [id, setId] = useState<string | null>(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
  useEffect(() => {
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<string>;
      setId(ev.detail ?? null);
    };
    window.addEventListener("gabley:branch-changed", onChange);
    return () => window.removeEventListener("gabley:branch-changed", onChange);
  }, []);
  return id;
}
