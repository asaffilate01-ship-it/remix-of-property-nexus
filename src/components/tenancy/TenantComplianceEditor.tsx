import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export type TenantComplianceMap = {
  right_to_rent_expires?: string | null;
  right_to_rent_reference?: string | null;
  passport_expires?: string | null;
  passport_number?: string | null;
  visa_expires?: string | null;
  visa_type?: string | null;
  referencing_completed_on?: string | null;
  referencing_outcome?: string | null;
  deposit_protected_on?: string | null;
  deposit_scheme_ref?: string | null;
  how_to_rent_issued_on?: string | null;
  epc_issued_on?: string | null;
  gas_safety_issued_on?: string | null;
};

const FIELDS: Array<{ key: keyof TenantComplianceMap; label: string; type: "date" | "text"; required?: boolean }> = [
  { key: "right_to_rent_expires", label: "Right-to-Rent expiry", type: "date", required: true },
  { key: "right_to_rent_reference", label: "RtR share-code / reference", type: "text" },
  { key: "passport_expires", label: "Passport expiry", type: "date" },
  { key: "passport_number", label: "Passport / ID number", type: "text" },
  { key: "visa_expires", label: "Visa / BRP expiry", type: "date" },
  { key: "visa_type", label: "Visa type", type: "text" },
  { key: "referencing_completed_on", label: "Referencing completed", type: "date" },
  { key: "referencing_outcome", label: "Referencing outcome", type: "text" },
  { key: "deposit_protected_on", label: "Deposit protected on", type: "date" },
  { key: "deposit_scheme_ref", label: "Deposit scheme ref", type: "text" },
  { key: "how_to_rent_issued_on", label: "How-to-Rent issued", type: "date" },
  { key: "epc_issued_on", label: "EPC served to tenant", type: "date" },
  { key: "gas_safety_issued_on", label: "Gas safety served", type: "date" },
];

export function TenantComplianceEditor({ value, onChange }: { value: TenantComplianceMap; onChange: (v: TenantComplianceMap) => void }) {
  const set = (k: keyof TenantComplianceMap, v: string) => onChange({ ...value, [k]: v || null });
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-primary" /> Tenant compliance & expiry dates
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label className="text-xs">
              {f.label} {f.required && <span className="text-destructive">*</span>}
            </Label>
            <Input type={f.type} value={(value[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Missing or soon-to-expire items appear on the dashboard alerts widget.</p>
    </div>
  );
}
