// Server-only context builder + model call for the Gabley AI Copilot.

export type CopilotMessage = { role: "user" | "assistant"; content: string };

export type CopilotContext = {
  agency_name: string | null;
  properties: number;
  active_tenancies: number;
  published_listings: number;
  draft_listings: number;
  open_leads: number;
  open_work_orders: number;
  arrears_count: number;
  arrears_total: number;
  compliance_expiring_30d: Array<{ type: string; property: string | null; expires_on: string }>;
  viewings_next_7d: number;
};

const money = (n: number) => `£${(n ?? 0).toLocaleString("en-GB")}`;

export async function buildCopilotContext(supabase: any, userId: string): Promise<CopilotContext> {
  const owned = await supabase.from("agencies").select("id, name").eq("owner_id", userId).limit(1).maybeSingle();
  let agencyId: string | null = owned.data?.id ?? null;
  let agencyName: string | null = owned.data?.name ?? null;
  if (!agencyId) {
    const mem = await supabase
      .from("agency_members")
      .select("agency_id, agencies(name)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    agencyId = mem.data?.agency_id ?? null;
    agencyName = mem.data?.agencies?.name ?? null;
  }

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const in7 = new Date(now.getTime() + 7 * 86400000).toISOString();
  const today = now.toISOString().slice(0, 10);

  const count = async (table: string, build: (q: any) => any) => {
    try {
      const { count: c } = await build(supabase.from(table).select("id", { count: "exact", head: true }));
      return c ?? 0;
    } catch {
      return 0;
    }
  };

  const [properties, activeTenancies, published, drafts, leads, workOrders, viewings] = await Promise.all([
    count("properties", (q) => q),
    count("tenancies", (q) => q.eq("status", "active")),
    count("listings", (q) => q.eq("status", "published")),
    count("listings", (q) => q.eq("status", "draft")),
    count("leads", (q) => q.in("status", ["new", "contacted", "qualified"])),
    count("work_orders", (q) => q.in("status", ["open", "in_progress", "quoted"])),
    count("viewings", (q) => q.gte("scheduled_at", now.toISOString()).lte("scheduled_at", in7)),
  ]);

  let arrearsCount = 0;
  let arrearsTotal = 0;
  try {
    const { data } = await supabase
      .from("rent_invoices")
      .select("amount, status, paid_at, rent_schedule(due_day)")
      .neq("status", "paid")
      .is("paid_at", null)
      .limit(500);
    for (const r of data ?? []) {
      const outstanding = Number(r.amount ?? 0);
      if (outstanding > 0) {
        arrearsCount += 1;
        arrearsTotal += outstanding;
      }
    }
  } catch {
    /* table shape differs — leave at zero */
  }

  let expiring: CopilotContext["compliance_expiring_30d"] = [];
  try {
    const { data } = await supabase
      .from("compliance_records")
      .select("type, expires_on, properties(address)")
      .gte("expires_on", today)
      .lte("expires_on", in30)
      .order("expires_on")
      .limit(15);
    expiring = (data ?? []).map((r: any) => ({
      type: String(r.type ?? "certificate"),
      property: r.properties?.address ?? null,
      expires_on: String(r.expires_on),
    }));
  } catch {
    /* ignore */
  }

  return {
    agency_name: agencyName,
    properties,
    active_tenancies: activeTenancies,
    published_listings: published,
    draft_listings: drafts,
    open_leads: leads,
    open_work_orders: workOrders,
    arrears_count: arrearsCount,
    arrears_total: Math.round(arrearsTotal),
    compliance_expiring_30d: expiring,
    viewings_next_7d: viewings,
  };
}

export function contextToPrompt(ctx: CopilotContext): string {
  return [
    `Agency: ${ctx.agency_name ?? "(not set)"}`,
    `Properties managed: ${ctx.properties}`,
    `Active tenancies: ${ctx.active_tenancies}`,
    `Published listings: ${ctx.published_listings} (drafts: ${ctx.draft_listings})`,
    `Open leads: ${ctx.open_leads}`,
    `Open work orders: ${ctx.open_work_orders}`,
    `Viewings in next 7 days: ${ctx.viewings_next_7d}`,
    `Rent arrears: ${ctx.arrears_count} charges, ${money(ctx.arrears_total)} outstanding`,
    ctx.compliance_expiring_30d.length
      ? `Compliance expiring within 30 days:\n${ctx.compliance_expiring_30d
          .map((c) => `  - ${c.type} at ${c.property ?? "unknown property"} expires ${c.expires_on}`)
          .join("\n")}`
      : "Compliance expiring within 30 days: none",
  ].join("\n");
}

export async function callCopilotModel(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, temperature: 0.3 }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings → Workspace → Usage.");
    console.error("[copilot] provider request failed", res.status, txt.slice(0, 300));
    throw new Error(`AI request failed (${res.status}).`);
  }
  const json = await res.json();
  return String(json?.choices?.[0]?.message?.content ?? "").slice(0, 8000);
}
