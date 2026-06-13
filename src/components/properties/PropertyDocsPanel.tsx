import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Doc = {
  id: string;
  name: string;
  folder: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export function PropertyDocsPanel({ propertyId }: { propertyId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("documents")
      .select("id, name, folder, storage_path, mime_type, size_bytes, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
  };
  useEffect(() => { load(); }, [propertyId]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `property/${propertyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("documents").insert({
        name: file.name,
        folder: "Properties",
        scope: "property",
        property_id: propertyId,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: u.user.id,
      });
      if (error) throw error;
      toast.success("Uploaded");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openDoc = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 600);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const del = async (d: Doc) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    await supabase.storage.from("documents").remove([d.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{docs.length} documents</div>
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="h-3 w-3 mr-1" /> {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>
      {docs.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
          No documents for this property yet
        </div>
      )}
      {docs.map((d) => (
        <Card key={d.id}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate text-sm">{d.name}</div>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <Badge variant="outline" className="text-[10px]">{d.folder}</Badge>
                  {d.size_bytes && <span>{(d.size_bytes / 1024).toFixed(0)} KB</span>}
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => openDoc(d)}><Download className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(d)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
