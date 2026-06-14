import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wrench, Home, Calendar, Banknote, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/work-orders/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Work order — Estately" }] }),
  component: WorkOrderDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">Failed to load work order: {error.message}</p>
        <Button size="sm" onClick={() => { reset(); router.invalidate(); }}>Retry</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Work order not found.</div>,
});

const STATUS = ["open", "in_progress", "on_hold", "completed", "cancelled"] as const;
const PRIORITY = ["low", "medium", "high", "urgent"] as const;

function WorkOrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["work-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, properties(id, title, address, city), contacts(id, full_name, email, phone)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      const { error } = await supabase.from("work_orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      void qc.invalidateQueries({ queryKey: ["work-order", id] });
      void qc.invalidateQueries({ queryKey: ["work-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading work order…</div>;
  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Work order not found.</p>
      </div>
    );
  }

  const property = (data as { properties?: { id: string; title: string; address: string | null; city: string | null } | null }).properties;
  const contact = (data as { contacts?: { id: string; full_name: string; email: string | null; phone: string | null } | null }).contacts;

  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" /> {data.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Created {data.created_at ? format(new Date(data.created_at), "d MMM yyyy") : ""}
            {data.category && <> · <span className="capitalize">{data.category}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={data.priority} onValueChange={(v) => update.mutate({ priority: v })}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={data.status} onValueChange={(v) => update.mutate({ status: v })}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data.description && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Description</p>
            <p className="text-sm whitespace-pre-wrap">{data.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {property && (
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Property</p>
              <div className="flex items-start gap-2">
                <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{property.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{property.address}{property.city ? `, ${property.city}` : ""}</p>
                </div>
              </div>
              <Link to="/properties" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Open property
              </Link>
            </CardContent>
          </Card>
        )}
        {contact && (
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Contact</p>
              <p className="text-sm font-medium">{contact.full_name}</p>
              {contact.email && <a href={`mailto:${contact.email}`} className="block text-xs text-muted-foreground hover:text-primary">{contact.email}</a>}
              {contact.phone && <a href={`tel:${contact.phone}`} className="block text-xs text-muted-foreground hover:text-primary">{contact.phone}</a>}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {data.scheduled_for && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Scheduled {format(new Date(data.scheduled_for), "d MMM, HH:mm")}
          </span>
        )}
        {data.estimated_cost != null && (
          <span className="inline-flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5" /> Est. £{Number(data.estimated_cost).toLocaleString()}
          </span>
        )}
        <Badge variant="secondary" className="capitalize">{data.priority}</Badge>
        <Badge variant="outline" className="capitalize">{data.status.replace(/_/g, " ")}</Badge>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/work-orders" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" /> Back to work orders
    </Link>
  );
}
