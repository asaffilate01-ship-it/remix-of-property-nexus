import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "gabley.cookie-consent.v1";
type Choice = "all" | "essential";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch { /* SSR / privacy mode */ }
  }, []);

  const decide = (c: Choice) => {
    try { localStorage.setItem(KEY, JSON.stringify({ choice: c, at: new Date().toISOString() })); } catch { /* privacy mode */ }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[calc(0.75rem+4.5rem+env(safe-area-inset-bottom))] sm:p-4 md:pb-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border bg-background/95 backdrop-blur shadow-2xl">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cookie className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-medium">We use cookies</div>
              <p className="text-muted-foreground mt-0.5">
                Essential cookies keep Gabley running. With your consent we also use analytics cookies to improve the product.{" "}
                <Link to="/cookies" className="underline hover:text-foreground">Read more</Link>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <Button variant="ghost" size="sm" onClick={() => decide("essential")}>Essential only</Button>
            <Button size="sm" onClick={() => decide("all")}>Accept all</Button>
            <button
              onClick={() => decide("essential")}
              aria-label="Dismiss"
              className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
