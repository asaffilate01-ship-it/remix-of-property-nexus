import { createServerFn } from "@tanstack/react-start";

export const DEMO_ACCOUNTS = [
  { email: "demo-landlord@estately.dev", password: "demo1234", role: "landlord", name: "Demo Landlord" },
  { email: "demo-agent@estately.dev", password: "demo1234", role: "agent", name: "Demo Agent" },
  { email: "demo-tenant@estately.dev", password: "demo1234", role: "tenant", name: "Demo Tenant" },
  { email: "demo-buyer@estately.dev", password: "demo1234", role: "buyer", name: "Demo Buyer" },
] as const;

export const ensureDemoUsers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = new Map((list?.users ?? []).map((u) => [u.email ?? "", u.id]));

  for (const d of DEMO_ACCOUNTS) {
    if (existing.has(d.email)) continue;
    await supabaseAdmin.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { full_name: d.name, role: d.role },
    });
  }
  return { ok: true };
});
