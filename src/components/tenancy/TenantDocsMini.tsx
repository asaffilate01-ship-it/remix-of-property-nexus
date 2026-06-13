import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Doc = { id: string; name: string; folder: string; storage_path: string; expires_on: string | null; size_bytes: number | null };

// Lightweight per-tenancy document uploader. Reuses the existing `documents` bucket and table.
export function TenantDocsMini({ tenancyId, tenantName }: { tenancyId: string; tenantName: string }) {
  const [rows, setRows] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState("Right to Rent");
  const [expires, setExpires] = useState("");

  const load = async () => {
    const { data } = await supabase.from("documents").select("id,name,folder,storage_path,expires_on,size_bytes")
      .eq("tenancy_id", tenancyId).order("created_at", { ascending: false });
    setRows((data ?? []) as Doc[]);
  };
  useEffect(() => { void load(); }, [tenancyId]);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in required");
      const path = `tenants/${tenancyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const row = {
        scope: "tenancy" as const,
        tenancy_id: tenancyId,
        name: file.name,
        folder,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        expires_on: expires || null,
        uploaded_by: u.user.id,
      };
      const { error } = await supabase.from("documents").insert(row);
      if (error) throw error;
      toast.success("Uploaded");
      setExpires("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setBusy(false); }
  };

  const remove = async (d: Doc) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    await supabase.storage.from("documents").remove([d.storage_path]);
    await supabase.from("documents").delete().eq("id", d.id);
    await load();
  };

  const open = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 600);
    if (error || !data) return toast.error("Could not open");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" /> Documents for {tenantName}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Folder</Label>
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Right to Rent" />
        </div>
        <div>
          <Label className="text-xs">Expiry (optional)</Label>
          <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Add file</Label>
          <label className="flex">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
            <Button asChild variant="outline" size="sm" className="cursor-pointer w-full" disabled={busy}>
              <span>{busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />} Upload</span>
            </Button>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded">No tenant documents yet. Upload Right-to-Rent, passport, references, signed AST, etc.</div>
      ) : (
        <div className="divide-y -mx-1">
          {rows.map((d) => {
            const today = new Date().toISOString().slice(0, 10);
            const overdue = d.expires_on && d.expires_on < today;
            return (
              <div key={d.id} className="px-1 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm truncate">{d.name}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{d.folder}</Badge>
                    {d.expires_on && (
                      <span className={overdue ? "text-destructive font-medium" : ""}>
                        expires {new Date(d.expires_on).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => open(d)} title="Open"><ExternalLink className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(d)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
