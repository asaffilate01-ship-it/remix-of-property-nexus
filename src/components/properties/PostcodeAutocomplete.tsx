import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  postcodes: string[];
  placeholder?: string;
};

export function PostcodeAutocomplete({ value, onChange, postcodes, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const uniq = Array.from(new Set(postcodes.filter(Boolean).map((p) => p.toUpperCase())));
    const areas = Array.from(
      new Set(uniq.map((p) => p.replace(/\s+/g, "").match(/^[A-Z]{1,2}\d{1,2}/)?.[0] ?? "").filter(Boolean))
    );
    const all = [...areas, ...uniq];
    if (!value) return all.slice(0, 8);
    const q = value.toUpperCase();
    return all.filter((p) => p.includes(q)).slice(0, 8);
  }, [postcodes, value]);

  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder ?? "Search title, city, postcode…"}
        className="pl-9"
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
