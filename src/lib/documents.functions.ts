import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type DocScope = "property" | "landlord" | "tenant" | "tenancy" | "agency";

export const fetchDocumentsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [docs, properties, agencies, tenancies, contacts] = await Promise.all([
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("id, title, address, city"),
      supabase.from("agencies").select("id, name"),
      supabase.from("tenancies").select("id, tenant_name, property_id"),
      supabase.from("contacts").select("id, full_name, contact_type, agency_id"),
    ]);
    return {
      documents: docs.data ?? [],
      properties: properties.data ?? [],
      agencies: agencies.data ?? [],
      tenancies: tenancies.data ?? [],
      contacts: contacts.data ?? [],
    };
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string;
    folder: string;
    scope: DocScope;
    scope_id: string;
    storage_path: string;
    mime_type?: string | null;
    size_bytes?: number | null;
    expires_on?: string | null;
    retention?: string | null;
    tags?: string[];
    notes?: string | null;
    agency_id?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const row = {
      name: data.name,
      folder: data.folder || "General",
      scope: data.scope,
      storage_path: data.storage_path,
      mime_type: data.mime_type ?? null,
      size_bytes: data.size_bytes ?? null,
      expires_on: data.expires_on || null,
      retention: data.retention || null,
      tags: data.tags ?? [],
      notes: data.notes || null,
      uploaded_by: context.userId,
      property_id: data.scope === "property" ? data.scope_id : null,
      landlord_contact_id: data.scope === "landlord" ? data.scope_id : null,
      tenant_contact_id: data.scope === "tenant" ? data.scope_id : null,
      tenancy_id: data.scope === "tenancy" ? data.scope_id : null,
      agency_id: data.scope === "agency" ? data.scope_id : data.agency_id ?? null,
    };
    const { error, data: inserted } = await context.supabase.from("documents").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted!.id };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase.from("documents").select("storage_path, locked").eq("id", data.id).single();
    if (doc?.locked) throw new Error("Document is locked");
    if (doc?.storage_path) {
      await context.supabase.storage.from("documents").remove([doc.storage_path]);
    }
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: doc, error: e1 } = await context.supabase.from("documents").select("storage_path").eq("id", data.id).single();
    if (e1 || !doc) throw new Error("Not found");
    const { data: signed, error } = await context.supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
