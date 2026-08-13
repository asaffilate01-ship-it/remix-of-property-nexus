import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type AlertRow = {
  id: string;
  title: string;
  body: string | null;
  severity: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const tone = (s: string) =>
  s === "danger" || s === "critical"
    ? "bg-destructive"
    : s === "warn" || s === "warning"
      ? "bg-amber-500"
      : "bg-primary";

export function NotificationBell() {
  const [items, setItems] = useState<AlertRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("alerts")
      .select("id,title,body,severity,link,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as AlertRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60000);
    return () => clearInterval(t);
  }, [load]);

  const unread = items.filter((i) => !i.read_at).length;

  const markAllRead = async () => {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
    await supabase.from("alerts").update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)));
    await supabase.from("alerts").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold leading-4 text-destructive-foreground ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.link ?? "/alerts"}
                    onClick={() => {
                      void markRead(a.id);
                      setOpen(false);
                    }}
                    className="flex gap-2.5 px-3 py-2.5 hover:bg-accent/60 transition-colors"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.read_at ? "bg-muted-foreground/30" : tone(a.severity)}`} />
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${a.read_at ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                        {a.title}
                      </span>
                      {a.body && <span className="block truncate text-xs text-muted-foreground">{a.body}</span>}
                      <span className="block text-[11px] text-muted-foreground/70">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border/60 p-2">
          <Link
            to="/alerts"
            onClick={() => setOpen(false)}
            className="block rounded-md px-2 py-1.5 text-center text-sm font-medium text-primary hover:bg-accent"
          >
            View all alerts & expiries
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
