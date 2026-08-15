import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

// ===== Pre-fill template values from related system entities =====
const prefillSchema = z.object({
  property_id: z.string().uuid().nullable().optional(),
  tenancy_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  booking_id: z.string().uuid().nullable().optional(),
  seller_id: z.string().uuid().nullable().optional(),
  buyer_id: z.string().uuid().nullable().optional(),
  work_order_id: z.string().uuid().nullable().optional(),
});

export const prefillTemplateValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof prefillSchema>) => prefillSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const values: Record<string, any> = {};
    const signers: Array<{ role: string; name: string; email: string }> = [];

    const fmtAddr = (p: any) => [p?.address, p?.city, p?.postcode].filter(Boolean).join(", ");

    let property: any = null;
    if (data.property_id) {
      const { data: p } = await sb.from("properties").select("*, agencies:agency_id(id,name), owner:profiles!properties_owner_id_fkey(id,full_name)").eq("id", data.property_id).maybeSingle();
      property = p;
    }
    if (property) {
      values.property_address = fmtAddr(property);
      values.owner_name = property.owner?.full_name ?? values.owner_name;
      values.landlord_name = property.owner?.full_name ?? values.landlord_name;
      values.agency_name = property.agencies?.name ?? values.agency_name;
      values.asking_price = property.asking_price ?? property.list_price ?? undefined;
    }

    if (data.tenancy_id) {
      const { data: t } = await sb.from("tenancies").select("*, tenants:tenant_id(*), properties:property_id(address,city,postcode)").eq("id", data.tenancy_id).maybeSingle();
      if (t) {
        values.tenant_name = t.tenants?.full_name ?? t.tenant_name ?? values.tenant_name;
        values.tenant_names = t.tenants?.full_name ?? t.tenant_name ?? values.tenant_names;
        values.start_date = t.start_date;
        values.end_date = t.end_date;
        values.rent_amount = t.rent_amount;
        values.rent_period = (t as any).rent_frequency === "weekly" ? "week" : "month";
        values.deposit_amount = t.deposit;
        values.deposit_scheme = t.deposit_scheme ?? "DPS";
        if (t.properties && !values.property_address) values.property_address = fmtAddr(t.properties);
        if (t.start_date && t.end_date) {
          const ms = new Date(t.end_date).getTime() - new Date(t.start_date).getTime();
          values.term_months = Math.round(ms / (1000 * 60 * 60 * 24 * 30));
        }
        if (t.tenants?.email) signers.push({ role: "tenant", name: t.tenants.full_name, email: t.tenants.email });
      }
    }

    if (data.tenant_id) {
      const { data: tn } = await sb.from("tenants").select("*").eq("id", data.tenant_id).maybeSingle();
      if (tn) {
        values.tenant_name = tn.full_name;
        if (tn.email) signers.push({ role: "tenant", name: tn.full_name, email: tn.email });
      }
    }

    if (data.booking_id) {
      const { data: b } = await sb.from("holiday_bookings").select("*, properties:property_id(address,city,postcode)").eq("id", data.booking_id).maybeSingle();
      if (b) {
        values.guest_name = b.guest_name;
        values.guests_count = b.guests_count;
        values.check_in = b.check_in;
        values.check_out = b.check_out;
        values.total = b.total;
        values.cleaning_fee = b.cleaning_fee;
        if (b.properties && !values.property_address) values.property_address = fmtAddr(b.properties);
        if (b.guest_email) signers.push({ role: "guest", name: b.guest_name, email: b.guest_email });
      }
    }

    if (data.contact_id) {
      const { data: c } = await sb.from("contacts").select("*").eq("id", data.contact_id).maybeSingle();
      if (c) {
        values.client_name = c.full_name;
        values.contractor_name = c.full_name;
        values.provider_name = c.full_name;
        if (c.email) signers.push({ role: c.contact_type ?? "party", name: c.full_name, email: c.email });
      }
    }

    if (data.seller_id) {
      const { data: s } = await sb.from("seller_profiles").select("*").eq("id", data.seller_id).maybeSingle();
      if (s) {
        values.seller_name = s.full_name;
        values.asking_price = s.asking_price ?? values.asking_price;
        if (s.email) signers.push({ role: "seller", name: s.full_name, email: s.email });
      }
    }

    if (data.buyer_id) {
      const { data: b } = await sb.from("buyer_profiles").select("*").eq("id", data.buyer_id).maybeSingle();
      if (b && b.email) signers.push({ role: "buyer", name: b.full_name, email: b.email });
    }

    // Agency / agent default
    const agencyId = await resolveAgencyId(sb, context.userId);
    if (agencyId && !values.agency_name) {
      const { data: ag } = await sb.from("agencies").select("name").eq("id", agencyId).maybeSingle();
      if (ag?.name) values.agency_name = ag.name;
    }

    return { values, suggested_signers: signers };
  });

// ===== Create instance with signers + send for signing =====
const sendSchema = z.object({
  template_id: z.string().uuid(),
  title: z.string().max(200).optional().nullable(),
  property_id: z.string().uuid().nullable().optional(),
  tenancy_id: z.string().uuid().nullable().optional(),
  booking_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  work_order_id: z.string().uuid().nullable().optional(),
  values: z.record(z.string(), z.any()).default({}),
  expires_on: z.string().optional().nullable().or(z.literal("")),
  signers: z.array(z.object({
    role: z.string().min(1).max(40),
    name: z.string().min(1).max(200),
    email: z.string().email().max(255),
  })).min(1).max(10),
});

export const sendForSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof sendSchema>) => sendSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agency_id = await resolveAgencyId(context.supabase, context.userId);
    if (!agency_id) throw new Error("No agency for current user");

    const { data: inst, error: e1 } = await context.supabase.from("template_instances").insert({
      template_id: data.template_id,
      agency_id,
      created_by: context.userId,
      title: data.title || null,
      property_id: data.property_id || null,
      tenancy_id: data.tenancy_id || null,
      booking_id: data.booking_id || null,
      contact_id: data.contact_id || null,
      work_order_id: data.work_order_id || null,
      values: data.values,
      expires_on: data.expires_on || null,
      status: "draft",
      sent_at: null,
      signers_meta: data.signers,
    }).select("id").single();
    if (e1) throw new Error(e1.message);

    const sigRows = data.signers.map((s, i) => ({
      instance_id: inst!.id,
      signer_role: s.role,
      signer_name: s.name,
      signer_email: s.email,
      order_index: i,
    }));
    const { data: sigs, error: e2 } = await context.supabase.from("template_signatures").insert(sigRows).select("token,signer_email,signer_name");
    if (e2) throw new Error(e2.message);

    const { data: queued, error: queueError } = await (context.supabase as any)
      .rpc("queue_signature_request_emails", { _instance_id: inst!.id });

    if (queueError) {
      console.error("Unable to queue signing emails", { instanceId: inst!.id, error: queueError.message });
    }

    return {
      id: inst!.id,
      signing_links: sigs ?? [],
      delivery: queueError ? "manual" as const : "queued" as const,
      queued: typeof queued === "number" ? queued : 0,
    };
  });

export const listSigningRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { requests: [] };
    const { data, error } = await context.supabase
      .from("template_instances")
      .select("id, title, status, created_at, sent_at, signed_at, expires_on, templates(name), template_signatures(id, token, signer_name, signer_email, signer_role, status, signed_at)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

// ===== Sign by token (PUBLIC — no auth) =====
export const getSigningContext = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(20).max(80) }))
  .handler(async ({ data }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit("signing_context", 60, 600);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sig } = await supabaseAdmin.from("template_signatures").select("*").eq("token", data.token).maybeSingle();
    if (!sig) throw new Error("Invalid signing link");
    const { data: inst } = await supabaseAdmin.from("template_instances").select("*, templates:template_id(name,body,signers,description,authority)").eq("id", sig.instance_id).single();
    if (!inst || inst.status === "void") throw new Error("This signing request is no longer available");
    if (inst.expires_on && new Date(`${inst.expires_on}T23:59:59Z`).getTime() < Date.now()) {
      await supabaseAdmin.from("template_signatures").update({ status: "expired" }).eq("id", sig.id).eq("status", "pending");
      throw new Error("This signing link has expired");
    }
    return { signature: sig, instance: inst };
  });

export const submitSignature = createServerFn({ method: "POST" })
  .validator(z.object({
    token: z.string().min(20).max(80),
    typed_signature: z.string().min(1).max(200),
    signature_image_b64: z.string().max(500_000).optional().nullable(),
  }))
  .handler(async ({ data }) => {
    const { createHash } = await import("node:crypto");
    const { callerIdentifier, enforceRateLimit } = await import("./rate-limit.server");
    const tokenHash = createHash("sha256").update(data.token).digest("hex");
    await enforceRateLimit("submit_signature", 10, 3_600, `${callerIdentifier()}:${tokenHash}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sig } = await supabaseAdmin.from("template_signatures").select("*").eq("token", data.token).maybeSingle();
    if (!sig) throw new Error("Invalid link");
    if (sig.status === "signed") return { ok: true, already: true };
    if (sig.status !== "pending") throw new Error("This signing request is no longer available");
    const { data: instance } = await supabaseAdmin.from("template_instances").select("status, expires_on").eq("id", sig.instance_id).single();
    if (!instance || instance.status === "void") throw new Error("This signing request is no longer available");
    if (instance.expires_on && new Date(`${instance.expires_on}T23:59:59Z`).getTime() < Date.now()) {
      await supabaseAdmin.from("template_signatures").update({ status: "expired" }).eq("id", sig.id);
      throw new Error("This signing link has expired");
    }

    let imagePath: string | null = null;
    if (data.signature_image_b64) {
      const m = data.signature_image_b64.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/);
      if (m) {
        const bytes = Buffer.from(m[2], "base64");
        if (bytes.byteLength > 375_000) throw new Error("Signature image is too large");
        const path = `signatures/${sig.id}.png`;
        const { error: upErr } = await supabaseAdmin.storage.from("documents").upload(path, bytes, { contentType: m[1], upsert: true });
        if (!upErr) imagePath = path;
      }
    }

    const { error: signatureError } = await supabaseAdmin.from("template_signatures").update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signed_ip: callerIdentifier(),
      typed_signature: data.typed_signature,
      signature_image_path: imagePath,
    }).eq("id", sig.id).eq("status", "pending");
    if (signatureError) throw new Error("Unable to record signature");

    // If all signers signed, mark the instance signed
    const { data: remaining } = await supabaseAdmin.from("template_signatures").select("status").eq("instance_id", sig.instance_id);
    if ((remaining ?? []).every((r) => r.status === "signed")) {
      await supabaseAdmin.from("template_instances").update({ status: "signed", signed_at: new Date().toISOString() }).eq("id", sig.instance_id);
    }

    return { ok: true };
  });
