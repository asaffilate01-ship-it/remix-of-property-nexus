import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Calendar, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Lead — Estately" }] }),
  component: LeadDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">Failed to load lead: {error.message}</p>
        <Button size="sm" onClick={() => { reset(); router.invalidate(); }}>Retry</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Lead not found.</div>,
});

const STATUS_OPTIONS = ["new", "contacted", "qualified", "viewing_booked", "offer", "won", "lost"] as const;

function LeadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, listings(id, slug, title, city)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      void qc.invalidateQueries({ queryKey: ["lead", id] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading lead…</div>;
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Lead not found.</p>
      </div>
    );
  }

  const listing = (data as { listings?: { id: string; slug: string; title: string; city: string | null } | null }).listings;

  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            From <span className="capitalize">{data.source ?? "marketplace"}</span> ·{" "}
            {data.created_at ? format(new Date(data.created_at), "d MMM yyyy, HH:mm") : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={data.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.email && (
              <a href={`mailto:${data.email}`} className="flex items-center gap-3 text-sm hover:text-primary">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{data.email}</span>
              </a>
            )}
            {data.phone && (
              <a href={`tel:${data.phone}`} className="flex items-center gap-3 text-sm hover:text-primary">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{data.phone}</span>
              </a>
            )}
          </div>
          {data.message && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {data.message}
            </div>
          )}
          {listing && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Listing</p>
                <p className="text-sm font-medium truncate">{listing.title}</p>
                {listing.city && <p className="text-xs text-muted-foreground">{listing.city}</p>}
              </div>
              <Link to="/marketplace/$slug" params={{ slug: listing.slug }}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to="/viewings"><Button variant="outline" size="sm" className="gap-1.5"><Calendar className="h-4 w-4" /> Book viewing</Button></Link>
        <Link to="/offers"><Button variant="outline" size="sm" className="gap-1.5"><FileText className="h-4 w-4" /> Log offer</Button></Link>
        <Badge variant="secondary" className="capitalize">{data.status}</Badge>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/leads" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" /> Back to leads
    </Link>
  );
}
