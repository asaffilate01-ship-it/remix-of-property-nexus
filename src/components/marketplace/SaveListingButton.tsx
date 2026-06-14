import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";

type Props = { listingId: string; variant?: "default" | "outline" | "ghost"; size?: "sm" | "default" | "icon" };

export function SaveListingButton({ listingId, variant = "outline", size = "default" }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancel) return;
      const id = data.user?.id ?? null;
      setUid(id);
      if (!id) return;
      const { data: row } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", id)
        .eq("listing_id", listingId)
        .maybeSingle();
      if (!cancel) setSaved(!!row);
    })();
    return () => { cancel = true; };
  }, [listingId]);

  const toggle = async () => {
    if (!uid) {
      toast.info("Sign in to save listings");
      navigate({ to: "/auth", search: { redirect: location.href } as never });
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        const { error } = await supabase.from("saved_listings")
          .delete().eq("user_id", uid).eq("listing_id", listingId);
        if (error) throw error;
        setSaved(false);
        toast.success("Removed from saved");
      } else {
        const { error } = await supabase.from("saved_listings")
          .insert({ user_id: uid, listing_id: listingId });
        if (error) throw error;
        setSaved(true);
        toast.success("Saved");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
    } finally { setBusy(false); }
  };

  return (
    <Button type="button" variant={variant} size={size} onClick={toggle} disabled={busy}>
      <Heart className={`h-4 w-4 ${size !== "icon" ? "mr-1.5" : ""}`} fill={saved ? "currentColor" : "none"} />
      {size !== "icon" && (saved ? "Saved" : "Save")}
    </Button>
  );
}
