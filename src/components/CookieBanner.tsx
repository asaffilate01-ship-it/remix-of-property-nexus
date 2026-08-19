import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ACCEPT_ALL,
  ESSENTIAL_ONLY,
  CONSENT_EVENT,
  readConsent,
  writeConsent,
  type ConsentState,
} from "@/lib/consent";

const CATEGORIES: { key: "preferences" | "analytics" | "marketing"; title: string; body: string }[] = [
  {
    key: "preferences",
    title: "Preferences",
    body: "Remembers your language, theme, saved filters and layout choices.",
  },
  {
    key: "analytics",
    title: "Analytics",
    body: "Aggregated, privacy-friendly usage stats so we can improve Gabley.",
  },
  {
    key: "marketing",
    title: "Marketing",
    body: "Measures campaigns and shows relevant property content off-site.",
  },
];

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [draft, setDraft] = useState({ preferences: true, analytics: true, marketing: false });

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentState | null>).detail;
      if (!detail) setOpen(true);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  const save = (choice: typeof ACCEPT_ALL) => {
    writeConsent(choice);
    setManage(false);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <>
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
                  Essential cookies keep Gabley running. With your consent we also use preference, analytics and
                  marketing cookies.{" "}
                  <Link to="/cookies" className="underline hover:text-foreground">
                    Cookie policy
                  </Link>
                  {" · "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    Privacy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setManage(true)}>
                Manage
              </Button>
              <Button variant="outline" size="sm" onClick={() => save(ESSENTIAL_ONLY)}>
                Essential only
              </Button>
              <Button size="sm" onClick={() => save(ACCEPT_ALL)}>
                Accept all
              </Button>
              <button
                onClick={() => save(ESSENTIAL_ONLY)}
                aria-label="Reject non-essential cookies"
                className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>Choose which cookies Gabley may use. You can change this any time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="text-sm">
                <div className="font-medium">Strictly necessary</div>
                <p className="text-muted-foreground">Sign-in, security and core functionality. Always on.</p>
              </div>
              <Switch checked disabled aria-label="Strictly necessary cookies (always on)" />
            </div>
            {CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div className="text-sm">
                  <div className="font-medium">{c.title}</div>
                  <p className="text-muted-foreground">{c.body}</p>
                </div>
                <Switch
                  checked={draft[c.key]}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}
                  aria-label={`${c.title} cookies`}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => save(ESSENTIAL_ONLY)}>
              Reject all
            </Button>
            <Button onClick={() => save({ necessary: true, ...draft })}>Save preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
