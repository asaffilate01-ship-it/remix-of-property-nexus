import { BadgeCheck, ShieldCheck, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "verified" | "photos" | "agency";

const META: Record<Kind, { label: string; icon: typeof BadgeCheck; cls: string; title: string }> = {
  verified: { label: "Truecheck", icon: ShieldCheck, cls: "bg-success/10 text-success border-success/30", title: "Listing details verified by Estately" },
  photos: { label: "Verified photos", icon: Camera, cls: "bg-primary/10 text-primary border-primary/30", title: "Photos taken or verified by Estately" },
  agency: { label: "Verified agency", icon: BadgeCheck, cls: "bg-success/10 text-success border-success/30", title: "Agency identity and licence verified" },
};

export function VerifiedBadge({ kind = "verified", className, compact = false }: { kind?: Kind; className?: string; compact?: boolean }) {
  const m = META[kind];
  const Icon = m.icon;
  return (
    <span
      title={m.title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        m.cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {!compact && m.label}
    </span>
  );
}
