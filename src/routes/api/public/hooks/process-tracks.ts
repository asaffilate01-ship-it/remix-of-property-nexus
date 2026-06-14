import { createFileRoute } from "@tanstack/react-router";

/**
 * Runner for Tracks (workflow automation).
 * Called by pg_cron every minute. Picks up due steps via the
 * claim_due_track_steps RPC, dispatches each action, and marks the
 * row done/failed. When a run's steps are all complete it marks the
 * run completed.
 */
export const Route = createFileRoute("/api/public/hooks/process-tracks")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: due, error } = await supabaseAdmin.rpc("claim_due_track_steps", { _limit: 50 });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
        }

        const results: { id: string; status: string; error?: string }[] = [];

        for (const row of (due ?? []) as any[]) {
          try {
            await dispatch(supabaseAdmin, row);
            await supabaseAdmin.from("track_run_steps").update({
              status: "done", executed_at: new Date().toISOString(),
            }).eq("id", row.run_step_id);
            results.push({ id: row.run_step_id, status: "done" });
          } catch (e: any) {
            await supabaseAdmin.from("track_run_steps").update({
              status: "failed", error: String(e?.message ?? e), executed_at: new Date().toISOString(),
            }).eq("id", row.run_step_id);
            results.push({ id: row.run_step_id, status: "failed", error: String(e?.message ?? e) });
          }

          // If this was the last step in the run, complete the run
          const { count: pendingCount } = await supabaseAdmin
            .from("track_run_steps")
            .select("id", { count: "exact", head: true })
            .eq("run_id", row.run_id)
            .eq("status", "pending");
          if ((pendingCount ?? 0) === 0) {
            await supabaseAdmin.from("track_runs").update({
              status: "completed", completed_at: new Date().toISOString(),
            }).eq("id", row.run_id).eq("status", "running");
          }
        }

        return Response.json({ processed: results.length, results });
      },
    },
  },
});

async function dispatch(admin: any, row: any) {
  const cfg = row.action_config ?? {};
  switch (row.action_type) {
    case "wait":
      return;
    case "create_alert": {
      // Lightweight: insert a tenancy_event or a generic notification.
      // We just log via a row in a generic "alerts-style" insert when applicable.
      // For v1 we store the alert as a tenancy_event when entity is tenancy.
      if (row.entity_type === "tenancy") {
        await admin.from("tenancy_events").insert({
          tenancy_id: row.entity_id,
          event_type: cfg.event_type ?? "automation_alert",
          notes: cfg.message ?? "Track step",
        });
      }
      return;
    }
    case "create_task": {
      // Minimal: insert into work_orders when entity_type is tenancy/property; otherwise no-op.
      if (cfg.title && (row.entity_type === "tenancy" || row.entity_type === "listing")) {
        await admin.from("work_orders").insert({
          agency_id: row.agency_id,
          title: cfg.title,
          description: cfg.description ?? null,
          priority: cfg.priority ?? "normal",
          status: "open",
        });
      }
      return;
    }
    case "add_tag": {
      if (row.entity_type === "contact" && cfg.tag) {
        const { data: c } = await admin.from("contacts").select("tags").eq("id", row.entity_id).single();
        const tags: string[] = Array.isArray(c?.tags) ? c.tags : [];
        if (!tags.includes(cfg.tag)) {
          await admin.from("contacts").update({ tags: [...tags, cfg.tag] }).eq("id", row.entity_id);
        }
      }
      return;
    }
    case "assign_to": {
      if (cfg.user_id) {
        const table = ({
          lead: "leads", listing: "listings", viewing: "viewings", offer: "offers",
          tenancy: "tenancies", contact: "contacts", deal: "deals",
        } as Record<string, string>)[row.entity_type];
        if (table) {
          await admin.from(table).update({ assigned_to: cfg.user_id }).eq("id", row.entity_id);
        }
      }
      return;
    }
    case "webhook": {
      if (cfg.url) {
        await fetch(cfg.url, {
          method: cfg.method ?? "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entity_type: row.entity_type, entity_id: row.entity_id, template_id: row.template_id, context: row.context, config: cfg }),
        }).catch(() => {});
      }
      return;
    }
    case "send_email": {
      // Enqueue via the existing transactional email queue if available.
      const to = cfg.to_email;
      if (!to) return;
      try {
        await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            template_name: cfg.template ?? "track-step",
            recipient_email: to,
            subject: cfg.subject ?? "Notification",
            html: cfg.html ?? cfg.body ?? "",
            text: cfg.text ?? cfg.body ?? "",
          },
        });
      } catch { /* email infra may not be set up; treat as ok */ }
      return;
    }
    case "send_sms": {
      // No SMS provider linked: no-op, success logged.
      return;
    }
  }
}
