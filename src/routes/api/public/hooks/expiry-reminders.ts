import { createFileRoute } from "@tanstack/react-router";
import { authorizeCronRequest } from "@/lib/security.server";

// Cron-triggered route: scans expiring contracts/documents/compliance/tenancies and enqueues reminder emails.
// Call daily via pg_cron. Idempotent per (item_id, days_left bucket) via email_send_log.message_id.

export const Route = createFileRoute("/api/public/hooks/expiry-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = authorizeCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const targets = [30, 14, 7, 1];
        const dates = targets.map((d) => {
          const t = new Date(today); t.setUTCDate(t.getUTCDate() + d);
          return { days: d, iso: t.toISOString().slice(0, 10) };
        });

        const out: any[] = [];

        for (const { days, iso } of dates) {
          const [contracts, docs, compliance, tenancies] = await Promise.all([
            supabaseAdmin.from("template_instances").select("id,title,expires_on,agency_id,signers_meta,template_id,templates:template_id(name)").eq("expires_on", iso),
            supabaseAdmin.from("documents").select("id,name,expires_on,agency_id").eq("expires_on", iso),
            supabaseAdmin.from("compliance_records").select("id,type,expires_on,agency_id,property_id").eq("expires_on", iso),
            supabaseAdmin.from("tenancies").select("id,tenant_name,tenant_email,end_date,agency_id").eq("end_date", iso),
          ]);

          for (const c of contracts.data ?? []) {
            await tryAlert(supabaseAdmin, {
              agency_id: (c as any).agency_id, kind: "contract_expiring",
              severity: days <= 7 ? "critical" : "warning",
              title: `Contract expires in ${days} day${days === 1 ? "" : "s"}`,
              body: (c as any).title ?? (c as any).templates?.name ?? "Contract",
              link: `/contracts/${c.id}`, entity_type: "contract", entity_id: c.id,
              dedupe_key: `expiry-contract-${c.id}-${days}`, out,
            });
            for (const s of ((c as any).signers_meta ?? [])) {
              if (!s.email) continue;
              await tryEnqueue(supabaseAdmin, {
                templateName: "contract-expiry-reminder", recipientEmail: s.email,
                idempotencyKey: `expiry-contract-${c.id}-${days}`,
                templateData: { recipient: s.name, item: (c as any).templates?.name ?? c.title ?? "Contract", days, expires_on: c.expires_on },
                out,
              });
            }
          }
          for (const d of docs.data ?? []) {
            await tryAlert(supabaseAdmin, {
              agency_id: (d as any).agency_id, kind: "document_expiring",
              severity: days <= 7 ? "critical" : "warning",
              title: `Document expires in ${days} day${days === 1 ? "" : "s"}`,
              body: (d as any).name, link: `/documents`,
              entity_type: "document", entity_id: d.id,
              dedupe_key: `expiry-document-${d.id}-${days}`, out,
            });
          }
          for (const r of compliance.data ?? []) {
            await tryAlert(supabaseAdmin, {
              agency_id: (r as any).agency_id, kind: "compliance_expiring",
              severity: days <= 7 ? "critical" : "warning",
              title: `${(r as any).type} expires in ${days} day${days === 1 ? "" : "s"}`,
              body: `Compliance record due ${(r as any).expires_on}`,
              link: `/compliance`, entity_type: "compliance_record", entity_id: r.id,
              dedupe_key: `expiry-compliance-${r.id}-${days}`, out,
            });
          }
          for (const t of tenancies.data ?? []) {
            await tryAlert(supabaseAdmin, {
              agency_id: (t as any).agency_id, kind: "tenancy_ending",
              severity: days <= 14 ? "warning" : "info",
              title: `Tenancy ends in ${days} day${days === 1 ? "" : "s"}`,
              body: (t as any).tenant_name ?? "Tenancy", link: `/renewals`,
              entity_type: "tenancy", entity_id: t.id,
              dedupe_key: `expiry-tenancy-${t.id}-${days}`, out,
            });
            if (!(t as any).tenant_email) continue;
            await tryEnqueue(supabaseAdmin, {
              templateName: "contract-expiry-reminder", recipientEmail: (t as any).tenant_email,
              idempotencyKey: `expiry-tenancy-${t.id}-${days}`,
              templateData: { recipient: (t as any).tenant_name, item: "Tenancy", days, expires_on: (t as any).end_date },
              out,
            });
          }
          out.push({ days, contracts: (contracts.data ?? []).length, docs: (docs.data ?? []).length, compliance: (compliance.data ?? []).length, tenancies: (tenancies.data ?? []).length });
        }

        return Response.json(
          { ok: true, processed: out.length },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});

async function tryAlert(sb: any, args: { agency_id: string; kind: string; severity: string; title: string; body?: string; link?: string; entity_type?: string; entity_id?: string; dedupe_key: string; out: any[] }) {
  if (!args.agency_id) return;
  try {
    const { error } = await sb.from("alerts").upsert({
      agency_id: args.agency_id, kind: args.kind, severity: args.severity,
      title: args.title, body: args.body ?? null, link: args.link ?? null,
      entity_type: args.entity_type ?? null, entity_id: args.entity_id ?? null,
      dedupe_key: args.dedupe_key,
    }, { onConflict: "agency_id,dedupe_key", ignoreDuplicates: true });
    args.out.push({ alert: args.dedupe_key, error: error?.message ?? null });
  } catch (e: any) {
    args.out.push({ alert: args.dedupe_key, error: e.message });
  }
}


async function tryEnqueue(sb: any, args: { templateName: string; recipientEmail: string; idempotencyKey: string; templateData: any; out: any[] }) {
  // Best-effort: enqueue_email RPC exists only when email infra is set up.
  try {
    const { error } = await sb.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      template_name: args.templateName,
      recipient_email: args.recipientEmail,
      template_data: args.templateData,
      idempotency_key: args.idempotencyKey,
    });
    args.out.push({ notification: args.idempotencyKey, error: error?.message ?? null });
  } catch (e: any) {
    args.out.push({ notification: args.idempotencyKey, error: e.message });
  }
}
