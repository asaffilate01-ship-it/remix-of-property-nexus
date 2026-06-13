import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, X } from "lucide-react";

export const FEATURE_OPTIONS = [
  "Parking",
  "Garden",
  "Furnished",
  "Part-furnished",
  "Unfurnished",
  "Pets allowed",
  "Lift",
  "Balcony",
  "Garage",
  "Washing machine",
  "Dishwasher",
  "WiFi",
  "Smart meter",
  "Double glazing",
  "Central heating",
  "Disabled access",
  "Bills included",
  "EPC A",
  "EPC B",
  "EPC C",
  "EPC D",
] as const;

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function FeatureMultiSelect({ value, onChange, placeholder = "Select features" }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="text-muted-foreground">
              {value.length ? `${value.length} selected` : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-2 max-h-72 overflow-y-auto" align="start">
          <div className="grid grid-cols-1 gap-1">
            {FEATURE_OPTIONS.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted cursor-pointer text-sm"
              >
                <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} />
                <span className="flex-1">{opt}</span>
                {value.includes(opt) && <Check className="h-3 w-3 text-primary" />}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              {v}
              <button
                type="button"
                onClick={() => toggle(v)}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
