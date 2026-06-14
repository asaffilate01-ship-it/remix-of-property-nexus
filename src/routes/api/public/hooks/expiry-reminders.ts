import { createFileRoute } from "@tanstack/react-router";

// Cron-triggered route: scans expiring contracts/documents/compliance/tenancies and enqueues reminder emails.
// Call daily via pg_cron. Idempotent per (item_id, days_left bucket) via email_send_log.message_id.

export const Route = createFileRoute("/api/public/hooks/expiry-reminders")({
  server: {
    handlers: {
      POST: async () => {
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
            for (const s of ((c as any).signers_meta ?? [])) {
              if (!s.email) continue;
              await tryEnqueue(supabaseAdmin, {
                templateName: "contract-expiry-reminder",
                recipientEmail: s.email,
                idempotencyKey: `expiry-contract-${c.id}-${days}`,
                templateData: { recipient: s.name, item: (c as any).templates?.name ?? c.title ?? "Contract", days, expires_on: c.expires_on },
                out,
              });
            }
          }
          for (const t of tenancies.data ?? []) {
            if (!(t as any).tenant_email) continue;
            await tryEnqueue(supabaseAdmin, {
              templateName: "contract-expiry-reminder",
              recipientEmail: (t as any).tenant_email,
              idempotencyKey: `expiry-tenancy-${t.id}-${days}`,
              templateData: { recipient: t.tenant_name, item: "Tenancy", days, expires_on: t.end_date },
              out,
            });
          }
          out.push({ days, contracts: (contracts.data ?? []).length, docs: (docs.data ?? []).length, compliance: (compliance.data ?? []).length, tenancies: (tenancies.data ?? []).length });
        }

        return Response.json({ ok: true, processed: out });
      },
    },
  },
});

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
    args.out.push({ email: args.recipientEmail, key: args.idempotencyKey, error: error?.message ?? null });
  } catch (e: any) {
    args.out.push({ email: args.recipientEmail, key: args.idempotencyKey, error: e.message });
  }
}
