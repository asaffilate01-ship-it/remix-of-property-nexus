import { useState } from "react";
import { Folder as FolderIcon, FolderOpen, Plus, ChevronRight, ChevronDown, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Folder = { id: string; name: string; parent_id: string | null };

type Node = Folder & { children: Node[] };

function build(folders: Folder[]): Node[] {
  const map = new Map<string, Node>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) map.get(n.parent_id)!.children.push(n);
    else roots.push(n);
  });
  return roots;
}

export function FolderTree({
  folders, selected, onSelect, onCreate,
}: {
  folders: Folder[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, parent: string | null) => Promise<void>;
}) {
  const [creatingFor, setCreatingFor] = useState<string | "root" | null>(null);
  const [draft, setDraft] = useState("");
  const tree = build(folders);

  const submit = async (parent: string | null) => {
    const name = draft.trim();
    if (!name) { setCreatingFor(null); return; }
    await onCreate(name, parent);
    setDraft(""); setCreatingFor(null);
  };

  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted",
          selected === null && "bg-muted font-medium",
        )}
      >
        <Inbox className="h-4 w-4" /> All captures
      </button>

      {tree.map((n) => (
        <TreeNode key={n.id} node={n} selected={selected} onSelect={onSelect} depth={0}
          creatingFor={creatingFor} setCreatingFor={setCreatingFor} draft={draft} setDraft={setDraft} submit={submit} />
      ))}

      {creatingFor === "root" ? (
        <div className="flex gap-1 pl-2 pt-1">
          <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Folder name"
            onKeyDown={(e) => e.key === "Enter" && submit(null)} className="h-7 text-sm" />
          <Button size="sm" className="h-7" onClick={() => submit(null)}>Add</Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => setCreatingFor("root")}>
          <Plus className="h-3.5 w-3.5" /> New folder
        </Button>
      )}
    </div>
  );
}

function TreeNode({
  node, depth, selected, onSelect, creatingFor, setCreatingFor, draft, setDraft, submit,
}: {
  node: Node; depth: number; selected: string | null; onSelect: (id: string | null) => void;
  creatingFor: string | "root" | null; setCreatingFor: (v: string | "root" | null) => void;
  draft: string; setDraft: (v: string) => void; submit: (parent: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const active = selected === node.id;
  return (
    <div>
      <div className={cn("group flex items-center gap-1 rounded-md hover:bg-muted", active && "bg-muted")}
        style={{ paddingLeft: depth * 12 }}>
        {node.children.length > 0 ? (
          <button onClick={() => setOpen(!open)} className="p-1 text-muted-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : <span className="w-5" />}
        <button onClick={() => onSelect(node.id)} className="flex-1 flex items-center gap-2 px-1 py-1.5 text-sm text-left">
          {open && node.children.length > 0 ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />}
          <span className={cn("truncate", active && "font-medium")}>{node.name}</span>
        </button>
        <button onClick={() => setCreatingFor(node.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground" title="New subfolder">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {creatingFor === node.id && (
        <div className="flex gap-1 py-1" style={{ paddingLeft: (depth + 1) * 12 + 4 }}>
          <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Subfolder"
            onKeyDown={(e) => e.key === "Enter" && submit(node.id)} className="h-7 text-sm" />
          <Button size="sm" className="h-7" onClick={() => submit(node.id)}>Add</Button>
        </div>
      )}
      {open && node.children.map((c) => (
        <TreeNode key={c.id} node={c} depth={depth + 1} selected={selected} onSelect={onSelect}
          creatingFor={creatingFor} setCreatingFor={setCreatingFor} draft={draft} setDraft={setDraft} submit={submit} />
      ))}
    </div>
  );
}
