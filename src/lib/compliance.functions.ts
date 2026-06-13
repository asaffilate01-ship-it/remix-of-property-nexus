import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ComplianceStatus = "valid" | "due_soon" | "expired" | "missing";

export function computeStatus(expires_on: string | null | undefined): ComplianceStatus {
  if (!expires_on) return "missing";
  const t = new Date(expires_on).getTime();
  const now = Date.now();
  if (t < now) return "expired";
  if (t - now < 30 * 86400000) return "due_soon";
  return "valid";
}

export const fetchComplianceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [rules, records, properties, agencies, tenancies] = await Promise.all([
      supabase.from("compliance_rules").select("*").order("scope").order("label"),
      supabase.from("compliance_records").select("*").order("expires_on", { ascending: true, nullsFirst: false }),
      supabase.from("properties").select("id, title, address, city"),
      supabase.from("agencies").select("id, name"),
      supabase.from("tenancies").select("id, tenant_name, property_id, room_id"),
    ]);
    return {
      rules: rules.data ?? [],
      records: records.data ?? [],
      properties: properties.data ?? [],
      agencies: agencies.data ?? [],
      tenancies: tenancies.data ?? [],
    };
  });

export const saveComplianceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    type: string;
    scope_kind: "property" | "agency" | "tenancy";
    scope_id: string;
    issued_on?: string | null;
    expires_on?: string | null;
    reference?: string | null;
    document_url?: string | null;
    notes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const row: Record<string, unknown> = {
      type: data.type,
      issued_on: data.issued_on || null,
      expires_on: data.expires_on || null,
      reference: data.reference || null,
      document_url: data.document_url || null,
      notes: data.notes || null,
      status: computeStatus(data.expires_on),
      property_id: data.scope_kind === "property" ? data.scope_id : null,
      agency_id: data.scope_kind === "agency" ? data.scope_id : null,
      tenancy_id: data.scope_kind === "tenancy" ? data.scope_id : null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("compliance_records").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("compliance_records").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteComplianceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("compliance_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
