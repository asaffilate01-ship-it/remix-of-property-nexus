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

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [name, setName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const syncUser = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!active) return;
      if (!u.user) {
        setUserId(null);
        setName("");
        setRole(null);
        setLoading(false);
        return;
      }

      setUserId(u.user.id);
      const meta = u.user.user_metadata as { full_name?: string; role?: AppRole } | undefined;
      setName(meta?.full_name ?? u.user.email ?? "");

      const { data: p } = await supabase
        .from("profiles")
        .select("primary_role,full_name")
        .eq("id", u.user.id)
        .maybeSingle();

      if (!active) return;
      const r = (p?.primary_role as AppRole | undefined) ?? meta?.role ?? "landlord";
      if (p?.full_name) setName(p.full_name);
      setRole(r);
      setLoading(false);
    };

    void syncUser();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setUserId(null);
        setName("");
        setRole(null);
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

  return { role, name, userId, loading };
}
