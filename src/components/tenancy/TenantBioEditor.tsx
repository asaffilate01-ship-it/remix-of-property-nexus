import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle } from "lucide-react";

export type TenantBio = {
  dob?: string | null;
  nationality?: string | null;
  ni_number?: string | null;
  employer?: string | null;
  job_title?: string | null;
  annual_income?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  previous_address?: string | null;
  guarantor_name?: string | null;
  guarantor_phone?: string | null;
  notes?: string | null;
};

const F: Array<{ key: keyof TenantBio; label: string; type?: string; full?: boolean; ph?: string }> = [
  { key: "dob", label: "Date of birth", type: "date" },
  { key: "nationality", label: "Nationality", ph: "British" },
  { key: "ni_number", label: "NI number", ph: "QQ 12 34 56 C" },
  { key: "job_title", label: "Job title" },
  { key: "employer", label: "Employer", full: true },
  { key: "annual_income", label: "Annual income (£)", type: "number" },
  { key: "previous_address", label: "Previous address", full: true },
  { key: "emergency_contact_name", label: "Emergency contact name" },
  { key: "emergency_contact_phone", label: "Emergency contact phone" },
  { key: "emergency_contact_relation", label: "Relationship" },
  { key: "guarantor_name", label: "Guarantor name" },
  { key: "guarantor_phone", label: "Guarantor phone" },
];

export function TenantBioEditor({ value, onChange }: { value: TenantBio; onChange: (v: TenantBio) => void }) {
  const set = (k: keyof TenantBio, v: string) => onChange({ ...value, [k]: v || null });
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <UserCircle className="h-4 w-4 text-primary" /> Bio data
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F.map((f) => (
          <div key={f.key} className={f.full ? "col-span-2" : ""}>
            <Label className="text-xs">{f.label}</Label>
            <Input type={f.type ?? "text"} value={(value[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.ph} />
          </div>
        ))}
        <div className="col-span-2">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
