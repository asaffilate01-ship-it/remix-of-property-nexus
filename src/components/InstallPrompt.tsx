import { useEffect, useState } from "react";
import { Download, X, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "estately:install-dismissed";

/** Native-app install affordance + offline indicator. Renders nothing when irrelevant. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (localStorage.getItem(DISMISS_KEY)) return;
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setDeferred(null));

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (offline) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <WifiOff className="h-3.5 w-3.5" />
        You're offline — changes won't save until the connection returns.
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 z-40 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card p-3 shadow-lg md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-start gap-3">
        <span className="brand-gradient mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white">
          <Download className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install Estately</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add it to your home screen for full-screen access and faster launches.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="h-8"
              onClick={async () => {
                const d = deferred;
                setDeferred(null);
                await d.prompt();
                await d.userChoice;
              }}
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                localStorage.setItem(DISMISS_KEY, "1");
                setDeferred(null);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDeferred(null);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
