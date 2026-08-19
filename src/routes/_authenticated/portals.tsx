import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Copy, Globe, KeyRound, Loader2, RefreshCcw, Send, ShieldCheck } from "lucide-react";
import { PORTAL_LIST, PORTAL_META, feedUrl, type PortalId } from "@/lib/portals";
import {
  ESIGN_PROVIDER_META,
  ESIGN_PROVIDERS,
  REFERENCING_PROVIDER_META,
  REFERENCING_PROVIDERS,
} from "@/lib/providers";
import { listPortalChannels, listPortalEvents, rotateFeedToken, upsertPortalChannel } from "@/lib/portals.functions";
import { listProviderConnections, upsertProviderConnection } from "@/lib/providers.functions";

export const Route = createFileRoute("/_authenticated/portals")({
  head: () => ({
    meta: [
      { title: "Portal feeds & providers — Gabley" },
      { name: "description", content: "Syndicate listings to Rightmove, Zoopla and OnTheMarket and connect referencing and e-sign providers." },
      { property: "og:title", content: "Portal feeds & providers — Gabley" },
      { property: "og:description", content: "Push listings to the major UK portals and wire your referencing and e-signature providers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalsPage,
});

type Channel = {
  id: string;
  portal: PortalId;
  enabled: boolean;
  auto_publish: boolean;
  branch_ref: string | null;
  network_ref: string | null;
  feed_token: string;
  last_feed_at: string | null;
};

function PortalsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [origin, setOrigin] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChannels = useServerFn(listPortalChannels);
  const saveChannel = useServerFn(upsertPortalChannel);
  const rotate = useServerFn(rotateFeedToken);
  const loadEvents = useServerFn(listPortalEvents);
  const loadConnections = useServerFn(listProviderConnections);
  const saveConnection = useServerFn(upsertProviderConnection);

  const refresh = async () => {
    try {
      const [c, e, p] = await Promise.all([loadChannels({}), loadEvents({}), loadConnections({})]);
      setChannels((c.channels as Channel[]) ?? []);
      setOrigin(c.origin || (typeof window !== "undefined" ? window.location.origin : ""));
      setEvents(e.events ?? []);
      setConnections(p.connections ?? []);
      setSecrets(p.secrets ?? {});
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byPortal = useMemo(() => {
    const map = new Map<PortalId, Channel>();
    channels.forEach((c) => map.set(c.portal, c));
    return map;
  }, [channels]);

  const update = async (portal: PortalId, patch: Partial<Channel>) => {
    const current = byPortal.get(portal);
    setBusy(portal);
    try {
      await saveChannel({
        data: {
          portal,
          enabled: patch.enabled ?? current?.enabled ?? true,
          auto_publish: patch.auto_publish ?? current?.auto_publish ?? false,
          branch_ref: patch.branch_ref ?? current?.branch_ref ?? null,
          network_ref: patch.network_ref ?? current?.network_ref ?? null,
        },
      });
      toast.success(`${PORTAL_META[portal].name} updated`);
      await refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setBusy(null);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Feed URL copied");
    } catch {
      toast.error("Could not copy — select the text instead");
    }
  };

  const referencingConn = connections.find((c) => c.kind === "referencing");
  const esignConn = connections.find((c) => c.kind === "esign");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portals & providers"
        description="Syndicate listings to the UK portals and connect your referencing and e-signature providers."
      />

      <Tabs defaultValue="portals">
        <TabsList>
          <TabsTrigger value="portals">Portal feeds</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="portals" className="space-y-4 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading channels…</div>
          ) : (
            PORTAL_LIST.map((meta) => {
              const ch = byPortal.get(meta.id);
              return (
                <Card key={meta.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4 text-primary" />
                        {meta.name}
                        {ch?.enabled ? <Badge variant="secondary">Enabled</Badge> : <Badge variant="outline">Off</Badge>}
                        {meta.supportsPush ? <Badge variant="outline">Real-time push</Badge> : <Badge variant="outline">Scheduled feed</Badge>}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
                    </div>
                    <Switch
                      checked={Boolean(ch?.enabled)}
                      disabled={busy === meta.id}
                      onCheckedChange={(v) => update(meta.id, { enabled: v })}
                      aria-label={`Enable ${meta.name}`}
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`ref-${meta.id}`}>{meta.refLabel}</Label>
                        <Input
                          id={`ref-${meta.id}`}
                          defaultValue={ch?.branch_ref ?? ""}
                          placeholder={meta.refHint}
                          onBlur={(e) => {
                            if (e.target.value !== (ch?.branch_ref ?? "")) update(meta.id, { branch_ref: e.target.value || null });
                          }}
                        />
                        <p className="text-xs text-muted-foreground">{meta.refHint}</p>
                      </div>
                      {meta.id === "rightmove" && (
                        <div className="space-y-1.5">
                          <Label htmlFor={`net-${meta.id}`}>Network ID</Label>
                          <Input
                            id={`net-${meta.id}`}
                            defaultValue={ch?.network_ref ?? ""}
                            placeholder="Rightmove network ID"
                            onBlur={(e) => {
                              if (e.target.value !== (ch?.network_ref ?? "")) update(meta.id, { network_ref: e.target.value || null });
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Publish new listings automatically</p>
                        <p className="text-xs text-muted-foreground">When a listing goes live in Gabley, queue it for {meta.name}.</p>
                      </div>
                      <Switch
                        checked={Boolean(ch?.auto_publish)}
                        disabled={!ch?.enabled || busy === meta.id}
                        onCheckedChange={(v) => update(meta.id, { auto_publish: v })}
                        aria-label={`Auto publish to ${meta.name}`}
                      />
                    </div>

                    {ch && (
                      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Feed URL</p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <code className="flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 text-xs">
                            {feedUrl(origin, ch.feed_token, meta.id)}
                          </code>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => copy(feedUrl(origin, ch.feed_token, meta.id))}>
                              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                setBusy(meta.id);
                                try {
                                  await rotate({ data: { channel_id: ch.id } });
                                  toast.success("Feed token rotated");
                                  await refresh();
                                } catch (e: any) {
                                  toast.error(String(e?.message ?? e));
                                } finally {
                                  setBusy(null);
                                }
                              }}
                            >
                              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Rotate
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Give this URL to {meta.name}. Last collected: {ch.last_feed_at ? new Date(ch.last_feed_at).toLocaleString("en-GB") : "never"}.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="providers" className="space-y-4 pt-4">
          <ProviderCard
            title="Tenant referencing"
            icon={<ShieldCheck className="h-4 w-4 text-primary" />}
            kind="referencing"
            providers={REFERENCING_PROVIDERS as readonly string[]}
            meta={REFERENCING_PROVIDER_META as Record<string, { name: string; blurb: string; secrets: string[] }>}
            connection={referencingConn}
            secrets={secrets}
            onSave={async (payload) => {
              await saveConnection({ data: { kind: "referencing", ...payload } });
              toast.success("Referencing provider saved");
              await refresh();
            }}
          />
          <ProviderCard
            title="E-signature"
            icon={<KeyRound className="h-4 w-4 text-primary" />}
            kind="esign"
            providers={ESIGN_PROVIDERS as readonly string[]}
            meta={ESIGN_PROVIDER_META as Record<string, { name: string; blurb: string; secrets: string[] }>}
            connection={esignConn}
            secrets={secrets}
            onSave={async (payload) => {
              await saveConnection({ data: { kind: "esign", ...payload } });
              toast.success("E-signature provider saved");
              await refresh();
            }}
          />
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent syndication activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing sent yet. Publish a listing to a portal to see activity here.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.listings?.title ?? "Listing"} → {PORTAL_META[(e.portal_channels?.portal ?? "gabley_site") as PortalId].name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={e.ok ? "secondary" : "destructive"}>{e.action}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("en-GB")}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProviderCard({
  title,
  icon,
  kind,
  providers,
  meta,
  connection,
  secrets,
  onSave,
}: {
  title: string;
  icon: React.ReactNode;
  kind: "referencing" | "esign";
  providers: readonly string[];
  meta: Record<string, { name: string; blurb: string; secrets: string[] }>;
  connection: any;
  secrets: Record<string, boolean>;
  onSave: (payload: { provider: string; enabled: boolean; api_url?: string | null; account_ref?: string | null; test_mode: boolean }) => Promise<void>;
}) {
  const [provider, setProvider] = useState<string>(connection?.provider ?? providers[0]);
  const [enabled, setEnabled] = useState<boolean>(connection?.enabled ?? false);
  const [apiUrl, setApiUrl] = useState<string>(connection?.config?.api_url ?? "");
  const [accountRef, setAccountRef] = useState<string>(connection?.config?.account_ref ?? "");
  const [testMode, setTestMode] = useState<boolean>(connection?.config?.test_mode ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!connection) return;
    setProvider(connection.provider);
    setEnabled(connection.enabled);
    setApiUrl(connection.config?.api_url ?? "");
    setAccountRef(connection.config?.account_ref ?? "");
    setTestMode(connection.config?.test_mode ?? true);
  }, [connection]);

  const required = meta[provider]?.secrets ?? [];
  const missing = required.filter((s) => !secrets[s]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={`Enable ${title}`} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>{meta[p]?.name ?? p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{meta[provider]?.blurb}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Account reference (optional)</Label>
            <Input value={accountRef} onChange={(e) => setAccountRef(e.target.value)} placeholder="Your account or branch reference" />
          </div>
        </div>

        {kind === "referencing" && (
          <div className="space-y-1.5">
            <Label>API endpoint override (optional)</Label>
            <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.provider.com/v1/checks" />
            <p className="text-xs text-muted-foreground">Leave blank to use the provider default.</p>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Sandbox / test mode</p>
            <p className="text-xs text-muted-foreground">Keep on until you have completed provider certification.</p>
          </div>
          <Switch checked={testMode} onCheckedChange={setTestMode} aria-label="Test mode" />
        </div>

        {required.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required secrets</p>
              <div className="flex flex-wrap gap-2">
                {required.map((s) => (
                  <Badge key={s} variant={secrets[s] ? "secondary" : "destructive"}>{s}{secrets[s] ? " ✓" : " missing"}</Badge>
                ))}
              </div>
              {missing.length > 0 && (
                <p className="text-xs text-muted-foreground">Add the missing keys in Cloud settings before switching off test mode.</p>
              )}
            </div>
          </>
        )}

        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({ provider, enabled, api_url: apiUrl || null, account_ref: accountRef || null, test_mode: testMode });
            } catch (e: any) {
              toast.error(String(e?.message ?? e));
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Save connection
        </Button>
      </CardContent>
    </Card>
  );
}
