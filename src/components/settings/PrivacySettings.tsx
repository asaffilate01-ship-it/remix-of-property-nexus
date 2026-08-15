import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, Database, Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createPrivacyRequest,
  listMyPrivacyRequests,
  listPrivacyRequestsForAdmin,
  updatePrivacyRequest,
  withdrawPrivacyRequest,
} from "@/lib/privacy.functions";
import {
  isActivePrivacyRequest,
  PRIVACY_REQUEST_LABELS,
  PRIVACY_REQUEST_TYPES,
  PRIVACY_STATUS_LABELS,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from "@/lib/privacy";

type MyPrivacyRequest = Awaited<ReturnType<typeof listMyPrivacyRequests>>["requests"][number];
type AdminPrivacyRequest = Awaited<
  ReturnType<typeof listPrivacyRequestsForAdmin>
>["requests"][number];

const ADMIN_STATUSES = [
  "submitted",
  "identity_verification",
  "in_progress",
  "completed",
  "refused",
] as const;

const NEXT_ADMIN_STATUSES: Record<string, readonly (typeof ADMIN_STATUSES)[number][]> = {
  submitted: ["submitted", "identity_verification", "refused"],
  identity_verification: ["identity_verification", "in_progress", "refused"],
  in_progress: ["in_progress", "completed", "refused"],
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "refused") return "destructive";
  if (status === "withdrawn") return "outline";
  return "secondary";
}

function friendlyDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PrivacySettings() {
  const { role } = useUserRole();
  const listMine = useServerFn(listMyPrivacyRequests);
  const submitRequest = useServerFn(createPrivacyRequest);
  const withdrawRequest = useServerFn(withdrawPrivacyRequest);
  const listAdmin = useServerFn(listPrivacyRequestsForAdmin);
  const [requests, setRequests] = useState<MyPrivacyRequest[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminPrivacyRequest[]>([]);
  const [requestType, setRequestType] = useState<PrivacyRequestType>("portability");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await listMine({});
      setRequests(mine.requests);
      if (role === "admin") {
        const queue = await listAdmin({});
        setAdminRequests(queue.requests);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load privacy requests");
    } finally {
      setLoading(false);
    }
  }, [listAdmin, listMine, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTypes = useMemo(
    () =>
      new Set(
        requests
          .filter((request) => isActivePrivacyRequest(request.status as PrivacyRequestStatus))
          .map((request) => request.request_type),
      ),
    [requests],
  );

  const submit = async () => {
    setBusy("submit");
    try {
      await submitRequest({ data: { requestType, details } });
      toast.success("Privacy request submitted");
      setDetails("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit request");
    } finally {
      setBusy(null);
    }
  };

  const withdraw = async (id: string) => {
    setBusy(id);
    try {
      await withdrawRequest({ data: { id } });
      toast.success("Privacy request withdrawn");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to withdraw request");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-card">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Your data rights</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Request access, portability, erasure, restriction or objection under UK GDPR.
                Requests are recorded with a one-month target date and an auditable status history.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="privacy-request-type">Request type</Label>
              <Select
                value={requestType}
                onValueChange={(value) => setRequestType(value as PrivacyRequestType)}
              >
                <SelectTrigger id="privacy-request-type" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIVACY_REQUEST_TYPES.map((type) => (
                    <SelectItem key={type} value={type} disabled={activeTypes.has(type)}>
                      {PRIVACY_REQUEST_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {requestType === "erasure" ? (
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                ) : requestType === "portability" ? (
                  <Download className="h-4 w-4 text-primary" aria-hidden="true" />
                ) : (
                  <Database className="h-4 w-4 text-primary" aria-hidden="true" />
                )}
                {PRIVACY_REQUEST_LABELS[requestType]}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Account deletion is reviewed before processing because tenancy, payment and tax
                records may have mandatory retention periods.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="privacy-request-details">Details (optional)</Label>
            <Textarea
              id="privacy-request-details"
              className="mt-1.5 min-h-24"
              maxLength={2000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Tell the privacy team what information or processing this request covers."
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {details.length}/2,000
            </div>
          </div>

          {requestType === "erasure" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={busy != null || activeTypes.has(requestType)}
                >
                  {busy === "submit" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Request account deletion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit an erasure request?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This does not delete data immediately. The privacy team will verify your
                    identity, review legal retention duties and explain any data that must be kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void submit()}
                  >
                    Submit request
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              onClick={() => void submit()}
              disabled={busy != null || activeTypes.has(requestType)}
            >
              {busy === "submit" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit privacy request
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-semibold">Request history</h2>
            <p className="text-sm text-muted-foreground">
              Status changes and response summaries remain available here.
            </p>
          </div>
          {loading ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : requests.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              You have not submitted a privacy request.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {requests.map((request) => {
                const status = request.status as PrivacyRequestStatus;
                return (
                  <div key={request.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {PRIVACY_REQUEST_LABELS[request.request_type as PrivacyRequestType]}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Submitted {friendlyDate(request.submitted_at)} · target{" "}
                          {friendlyDate(request.due_at)}
                        </div>
                      </div>
                      <Badge variant={statusVariant(status)}>{PRIVACY_STATUS_LABELS[status]}</Badge>
                    </div>
                    {request.response_summary && (
                      <p className="rounded-md bg-muted/50 p-3 text-sm">
                        {request.response_summary}
                      </p>
                    )}
                    {["submitted", "identity_verification"].includes(status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy != null}
                        onClick={() => void withdraw(request.id)}
                      >
                        {busy === request.id && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        Withdraw request
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {role === "admin" && (
        <AdminPrivacyQueue requests={adminRequests} loading={loading} onUpdated={load} />
      )}
    </div>
  );
}

function AdminPrivacyQueue({
  requests,
  loading,
  onUpdated,
}: {
  requests: AdminPrivacyRequest[];
  loading: boolean;
  onUpdated: () => Promise<void>;
}) {
  const updateRequest = useServerFn(updatePrivacyRequest);
  const [busy, setBusy] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const active = requests.filter((request) =>
    isActivePrivacyRequest(request.status as PrivacyRequestStatus),
  );

  const save = async (request: AdminPrivacyRequest) => {
    const status = (statuses[request.id] ?? request.status) as (typeof ADMIN_STATUSES)[number];
    const responseSummary = summaries[request.id] ?? request.response_summary ?? "";
    if (["completed", "refused"].includes(status) && !responseSummary.trim()) {
      toast.error("Add a response summary before closing this request.");
      return;
    }

    setBusy(request.id);
    try {
      await updateRequest({ data: { id: request.id, status, responseSummary } });
      toast.success("Privacy request updated");
      await onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update request");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Privacy operations queue</h2>
            <p className="text-sm text-muted-foreground">
              Restricted to authorised platform administrators in an MFA-verified session.
            </p>
          </div>
          <Badge variant={active.length > 0 ? "destructive" : "secondary"}>
            {active.length} active
          </Badge>
        </div>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : active.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            No active privacy requests.
          </p>
        ) : (
          <div className="space-y-4">
            {active.map((request) => {
              const overdue = new Date(request.due_at).getTime() < Date.now();
              return (
                <div key={request.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {request.requester_name} ·{" "}
                        {PRIVACY_REQUEST_LABELS[request.request_type as PrivacyRequestType]}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {friendlyDate(request.submitted_at)} · due{" "}
                        {friendlyDate(request.due_at)}
                      </p>
                    </div>
                    {overdue && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                  {request.details && (
                    <p className="text-sm text-muted-foreground">{request.details}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
                    <div>
                      <Label htmlFor={`privacy-status-${request.id}`}>Status</Label>
                      <Select
                        value={statuses[request.id] ?? request.status}
                        onValueChange={(value) =>
                          setStatuses((current) => ({ ...current, [request.id]: value }))
                        }
                      >
                        <SelectTrigger id={`privacy-status-${request.id}`} className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(NEXT_ADMIN_STATUSES[request.status] ?? ADMIN_STATUSES).map((status) => (
                            <SelectItem key={status} value={status}>
                              {PRIVACY_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`privacy-summary-${request.id}`}>Response summary</Label>
                      <Textarea
                        id={`privacy-summary-${request.id}`}
                        className="mt-1.5 min-h-10"
                        maxLength={4000}
                        value={summaries[request.id] ?? request.response_summary ?? ""}
                        onChange={(event) =>
                          setSummaries((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Required for completed or refused requests"
                      />
                    </div>
                    <Button disabled={busy != null} onClick={() => void save(request)}>
                      {busy === request.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
