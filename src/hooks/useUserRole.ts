import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "agent"
  | "landlord"
  | "tenant"
  | "buyer"
  | "conveyancer"
  | "contractor"
  | "inventory_clerk"
  | "utility_provider";

const APP_ROLES: AppRole[] = [
  "admin",
  "agent",
  "landlord",
  "tenant",
  "buyer",
  "conveyancer",
  "contractor",
  "inventory_clerk",
  "utility_provider",
];

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [name, setName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const syncUser = async () => {
      setLoading(true);
      setError(null);
      const { data: u, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError) {
        setUserId(null);
        setName("");
        setRole(null);
        setError("Your session could not be verified.");
        setLoading(false);
        return;
      }
      if (!u.user) {
        setUserId(null);
        setName("");
        setRole(null);
        setError(null);
        setLoading(false);
        return;
      }

      setUserId(u.user.id);
      const meta = u.user.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name ?? u.user.email ?? "");

      const [{ data: profile, error: profileError }, { data: roleRows, error: rolesError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("primary_role,full_name")
            .eq("id", u.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        ]);

      if (!active) return;
      if (profileError || rolesError) {
        setRole(null);
        setError("Your authorised workspace could not be loaded.");
        setLoading(false);
        return;
      }

      // Authorization roles come from the database, never mutable user metadata.
      // An explicit admin assignment takes precedence so the MFA route guard and
      // navigation shell cannot disagree about whether elevation is required.
      const hasAdminRole = (roleRows ?? []).some((row) => row.role === "admin");
      let resolvedRole: unknown = hasAdminRole ? "admin" : profile?.primary_role;
      if (profile?.full_name) setName(profile.full_name);
      if (!isAppRole(resolvedRole)) {
        const { data: provisioned } = await supabase.rpc("ensure_user_workspace");
        if (!active) return;
        resolvedRole = provisioned;
      }
      if (!isAppRole(resolvedRole)) {
        setRole(null);
        setError("No valid workspace role is assigned to this account.");
        setLoading(false);
        return;
      }

      setRole(resolvedRole);
      setLoading(false);
    };

    void syncUser();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setUserId(null);
        setName("");
        setRole(null);
        setError(null);
        setLoading(false);
        return;
      }
      void syncUser();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { role, name, userId, loading, error };
}
