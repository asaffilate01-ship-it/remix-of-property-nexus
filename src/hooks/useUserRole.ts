import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

type Workspace = {
  role: AppRole | null;
  name: string;
  userId: string | null;
  error: string | null;
};

const EMPTY: Workspace = { role: null, name: "", userId: null, error: null };

export const userWorkspaceQueryKey = ["user-workspace"] as const;

async function loadWorkspace(): Promise<Workspace> {
  const { data: u, error: userError } = await supabase.auth.getUser();
  if (userError) return { ...EMPTY, error: "Your session could not be verified." };
  if (!u.user) return EMPTY;

  const userId = u.user.id;
  const meta = u.user.user_metadata as { full_name?: string } | undefined;
  let name = meta?.full_name ?? u.user.email ?? "";

  const [{ data: profile, error: profileError }, { data: roleRows, error: rolesError }] =
    await Promise.all([
      supabase.from("profiles").select("primary_role,full_name").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

  if (profileError || rolesError) {
    return { ...EMPTY, userId, name, error: "Your authorised workspace could not be loaded." };
  }

  // Authorization roles come from the database, never mutable user metadata.
  // An explicit admin assignment takes precedence so the MFA route guard and
  // navigation shell cannot disagree about whether elevation is required.
  const hasAdminRole = (roleRows ?? []).some((row) => row.role === "admin");
  let resolvedRole: unknown = hasAdminRole ? "admin" : profile?.primary_role;
  if (profile?.full_name) name = profile.full_name;

  if (!isAppRole(resolvedRole)) {
    const { data: provisioned } = await supabase.rpc("ensure_user_workspace");
    resolvedRole = provisioned;
  }
  if (!isAppRole(resolvedRole)) {
    return { ...EMPTY, userId, name, error: "No valid workspace role is assigned to this account." };
  }

  return { role: resolvedRole, name, userId, error: null };
}

export function useUserRole() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: userWorkspaceQueryKey,
    queryFn: loadWorkspace,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.setQueryData(userWorkspaceQueryKey, EMPTY);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: userWorkspaceQueryKey });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const workspace = data ?? EMPTY;
  return {
    role: workspace.role,
    name: workspace.name,
    userId: workspace.userId,
    loading: isPending,
    error: workspace.error,
  };
}
