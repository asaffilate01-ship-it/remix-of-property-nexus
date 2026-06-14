import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExpiryItem = {
  id: string;
  kind: "contract" | "document" | "compliance" | "tenancy";
  title: string;
  expires_on: string; // ISO date
  link: string;
  days_left: number;
  bucket: "overdue" | "1d" | "7d" | "14d" | "30d" | "later";
  meta?: string;
};

function bucketFor(days: number): ExpiryItem["bucket"] {
  if (days < 0) return "overdue";
  if (days <= 1) return "1d";
  if (days <= 7) return "7d";
  if (days <= 14) return "14d";
  if (days <= 30) return "30d";
  return "later";
}

export const fetchExpiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 365);

    const [contracts, docs, compliance, tenancies] = await Promise.all([
      context.supabase.from("template_instances").select("id,title,expires_on,template_id,templates:template_id(name)").not("expires_on", "is", null),
      context.supabase.from("documents").select("id,name,expires_on,scope").not("expires_on", "is", null),
      context.supabase.from("compliance_records").select("id,type,expires_on,property_id").not("expires_on", "is", null),
      context.supabase.from("tenancies").select("id,tenant_name,end_date,property_id").not("end_date", "is", null),
    ]);

    const items: ExpiryItem[] = [];
    const addItem = (i: Omit<ExpiryItem, "days_left" | "bucket">) => {
      const d = new Date(i.expires_on);
      d.setHours(0, 0, 0, 0);
      const days = Math.round((d.getTime() - today.getTime()) / 86400000);
      items.push({ ...i, days_left: days, bucket: bucketFor(days) });
    };

    (contracts.data ?? []).forEach((c: any) =>
      addItem({ id: `c-${c.id}`, kind: "contract", title: c.title || c.templates?.name || "Contract", expires_on: c.expires_on, link: "/templates" })
    );
    (docs.data ?? []).forEach((d: any) =>
      addItem({ id: `d-${d.id}`, kind: "document", title: d.name, expires_on: d.expires_on, link: "/documents", meta: d.scope })
    );
    (compliance.data ?? []).forEach((c: any) =>
      addItem({ id: `cp-${c.id}`, kind: "compliance", title: c.type, expires_on: c.expires_on, link: "/compliance" })
    );
    (tenancies.data ?? []).forEach((t: any) =>
      addItem({ id: `t-${t.id}`, kind: "tenancy", title: `Tenancy: ${t.tenant_name ?? "—"}`, expires_on: t.end_date, link: `/tenancies/${t.id}` })
    );

    items.sort((a, b) => a.days_left - b.days_left);
    return { items };
  });
