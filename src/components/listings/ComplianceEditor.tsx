import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export type ComplianceMap = {
  epc_expires?: string | null;
  epc_reference?: string | null;
  gas_safety_expires?: string | null;
  gas_safety_reference?: string | null;
  eicr_expires?: string | null;
  eicr_reference?: string | null;
  pat_expires?: string | null;
  fire_risk_expires?: string | null;
  legionella_expires?: string | null;
  hmo_licence_number?: string | null;
  hmo_licence_expires?: string | null;
};

const FIELDS: Array<{ key: keyof ComplianceMap; label: string; type: "date" | "text"; required?: boolean }> = [
  { key: "epc_expires", label: "EPC expiry", type: "date", required: true },
  { key: "epc_reference", label: "EPC reference", type: "text" },
  { key: "gas_safety_expires", label: "Gas Safety expiry (CP12)", type: "date", required: true },
  { key: "gas_safety_reference", label: "Gas Safety reference", type: "text" },
  { key: "eicr_expires", label: "EICR (electrical) expiry", type: "date", required: true },
  { key: "eicr_reference", label: "EICR reference", type: "text" },
  { key: "pat_expires", label: "PAT testing expiry", type: "date" },
  { key: "fire_risk_expires", label: "Fire Risk Assessment expiry", type: "date" },
  { key: "legionella_expires", label: "Legionella risk expiry", type: "date" },
];

const HMO_FIELDS: Array<{ key: keyof ComplianceMap; label: string; type: "date" | "text"; required?: boolean }> = [
  { key: "hmo_licence_number", label: "HMO licence number", type: "text", required: true },
  { key: "hmo_licence_expires", label: "HMO licence expiry", type: "date", required: true },
];

type Props = {
  value: ComplianceMap;
  onChange: (next: ComplianceMap) => void;
  isHmo: boolean;
};

export function ComplianceEditor({ value, onChange, isHmo }: Props) {
  const set = (k: keyof ComplianceMap, v: string) => onChange({ ...value, [k]: v || null });
  const list = isHmo ? [...HMO_FIELDS, ...FIELDS] : FIELDS;
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-primary" /> Compliance & certificates
      </div>
      <div className="grid grid-cols-2 gap-3">
        {list.map((f) => (
          <div key={f.key}>
            <Label className="text-xs">
              {f.label} {f.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type={f.type}
              value={(value[f.key] as string) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Dates drive expiry alerts on the dashboard. Upload the full certificate PDFs in the Documents tab.
      </p>
    </div>
  );
}
