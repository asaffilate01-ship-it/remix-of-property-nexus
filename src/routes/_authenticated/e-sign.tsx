import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePenLine } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/e-sign")({
  head: () => ({ meta: [{ title: "E-signatures — Estately" }] }),
  component: ESignPage,
});

type Instance = { id: string; title: string | null; status: string; created_at: string; sent_at: string | null; signed_at: string | null; expires_on: string | null; templates: { name: string } | null };

function ESignPage() {
  const [rows, setRows] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("template_instances")
        .select("id, title, status, created_at, sent_at, signed_at, expires_on, templates(name)")
        .order("created_at", { ascending: false }).limit(100);
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  const tone = (s: string) =>
    s === "signed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s === "sent" ? "bg-blue-50 text-blue-700 border-blue-200" :
    s === "expired" ? "bg-red-50 text-red-700 border-red-200" :
    "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div className="space-y-6">
      <PageHeader title="E-signatures" description="Documents sent for signature — tenancies, notices and forms." />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><FilePenLine className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No documents sent for signature yet.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Title</th><th className="text-left p-3">Template</th><th className="text-left p-3">Sent</th><th className="text-left p-3">Signed</th><th className="text-left p-3">Expires</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.title ?? "—"}</td>
                  <td className="p-3 text-xs">{r.templates?.name ?? "—"}</td>
                  <td className="p-3 text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-xs">{r.signed_at ? new Date(r.signed_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-xs">{r.expires_on ? new Date(r.expires_on).toLocaleDateString() : "—"}</td>
                  <td className="p-3"><Badge className={`${tone(r.status)} border`} variant="outline">{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
