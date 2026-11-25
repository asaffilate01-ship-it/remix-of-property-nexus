import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Plus, MessageSquare, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Gabley" }] }),
  component: Inbox,
});

function Inbox() {
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messageState, setMessageState] = useState<{ threadId: string; rows: any[]; status: "loading" | "ready" | "error" } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [threadsStatus, setThreadsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [messageReload, setMessageReload] = useState(0);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const sendLock = useRef(false);
  const createLock = useRef(false);
  const activeId: string | undefined = active?.id;
  const body = activeId ? drafts[activeId] ?? "" : "";
  const currentMessages = messageState?.threadId === activeId ? messageState : null;
  const setBody = (value: string) => { if (activeId) setDrafts(old => ({ ...old, [activeId]: value })); };
  const [me, setMe] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    setThreadsStatus("loading");
    try {
      const { data, error } = await supabase
        .from("message_threads")
        .select("*")
        .order("last_message_at", { ascending: false })
        .order("id");
      if (error) throw error;
      setThreads(data ?? []);
      setThreadsStatus("ready");
    } catch {
      setThreads([]);
      setThreadsStatus("error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw new Error("Session unavailable");
        if (cancelled) return;
        setMe(user.id);
        await loadThreads();
      } catch {
        if (!cancelled) setThreadsStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const threadId = activeId;
    setMessageState({ threadId, rows: [], status: "loading" });
    const combine = (first: any[], second: any[]) => [...new Map([...first, ...second]
      .filter(row => row.thread_id === threadId)
      .map(row => [row.id, row])).values()]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .slice(-100);
    const load = async () => {
      try {
        const { data, error } = await supabase.from("messages").select("*").eq("thread_id", threadId)
          .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
        if (error) throw error;
        if (!cancelled) setMessageState(old => ({
          threadId, status: "ready",
          rows: combine(data ?? [], old?.threadId === threadId ? old.rows : []),
        }));
      } catch {
        if (!cancelled) setMessageState({ threadId, rows: [], status: "error" });
      }
    };
    const ch = supabase.channel(`thread:${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, p => {
        if (!cancelled) setMessageState(old => old?.threadId === threadId && old.status !== "error"
          ? { ...old, rows: combine(old.rows, [p.new]) } : old);
      })
      .subscribe(status => {
        if (!cancelled && status === "SUBSCRIBED") void load();
        if (!cancelled && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
          setMessageState({ threadId, rows: [], status: "error" });
        }
      });
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [activeId, messageReload]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" }); }, [currentMessages?.rows]);

  const send = async () => {
    if (!body.trim() || !activeId || !me || sendLock.current || currentMessages?.status !== "ready") return;
    const threadId = activeId;
    const text = body;
    sendLock.current = true;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({ thread_id: threadId, sender_id: me, body: text.trim() });
      if (error) throw error;
      setDrafts(old => old[threadId] === text ? { ...old, [threadId]: "" } : old);
    } catch {
      toast.error("Message could not be sent. Your draft is still available.");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const createThread = async () => {
    if (!newSubject.trim() || !me || createLock.current) return;
    createLock.current = true;
    setCreating(true);
    try {
    let participantId: string | null = null;
    if (newEmail.trim()) {
      const { data: p, error: participantError } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", newEmail.trim())
        .maybeSingle();
      if (participantError || !p) { toast.error("No unique authorised participant matched that exact name."); return; }
      participantId = p.id;
    }
    const { data: agencies, error: agencyError } = await supabase
      .from("agencies")
      .select("id")
      .eq("owner_id", me)
      .limit(1);
    if (agencyError) throw agencyError;
    const { data: t, error } = await supabase
      .from("message_threads")
      .insert({
        subject: newSubject.trim(),
        created_by: me,
        agency_id: agencies?.[0]?.id ?? null,
      })
      .select("*")
      .single();
    if (error || !t) throw error ?? new Error("Missing thread");
    if (participantId) {
      const { error: inviteError } = await supabase.from("thread_participants").insert({ thread_id: t.id, user_id: participantId });
      if (inviteError) toast.error("Conversation created, but participant could not be added. Do not assume they can see it.");
    }
    setNewOpen(false);
    setNewSubject("");
    setNewEmail("");
    await loadThreads();
    setActive(t);
    } catch { toast.error("Unable to create conversation."); }
    finally { createLock.current = false; setCreating(false); }
  };

  return (
    <div className="flex min-h-[24rem] flex-col gap-4 md:h-[calc(100dvh-8rem)] md:flex-row">
      <Card className={`min-w-0 flex-col md:flex md:w-80 md:shrink-0 ${activeId ? "hidden" : "flex"}`}>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Inbox</CardTitle>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" aria-label="New conversation" disabled={!me || creating} className="min-h-11 min-w-11">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="conversation-subject">Subject</Label>
                  <Input id="conversation-subject" maxLength={200} value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="conversation-participant">Participant (exact full name, optional)</Label>
                  <Input id="conversation-participant" maxLength={200} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createThread} disabled={creating || !newSubject.trim() || !me}>{creating ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {threadsStatus === "loading" && <div role="status" className="p-4 text-sm">Loading conversations…</div>}
          {threadsStatus === "error" && <div role="alert" className="p-4 space-y-3 text-sm"><p>Unable to load conversations.</p><Button variant="outline" onClick={() => void loadThreads()}>Retry</Button></div>}
          {threadsStatus === "ready" && threads.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
          )}
          {threadsStatus === "ready" && threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              aria-current={activeId === t.id ? "true" : undefined}
              className={`w-full text-left px-4 py-3 border-b hover:bg-muted ${active?.id === t.id ? "bg-muted" : ""}`}
            >
              <div className="font-medium text-sm break-words">{t.subject}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(t.last_message_at).toLocaleString()}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className={`min-w-0 min-h-[28rem] flex-1 flex-col md:flex ${activeId ? "flex" : "hidden"}`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2" />
            Select a conversation
          </div>
        ) : (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2"><Button type="button" size="icon" variant="ghost" className="md:hidden min-h-11 min-w-11" aria-label="Back to conversations" onClick={() => setActive(null)}><ArrowLeft className="h-5 w-5" /></Button><CardTitle className="text-base break-words">{active.subject}</CardTitle></div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 max-h-[60dvh] md:max-h-none overflow-y-auto space-y-2 py-4">
              {!currentMessages || currentMessages.status === "loading" ? <p role="status" className="text-sm text-muted-foreground">Loading messages…</p> : currentMessages.status === "error" ? <div role="alert" className="space-y-2"><p>Unable to verify messages.</p><Button variant="outline" onClick={() => setMessageReload(n => n + 1)}>Retry</Button></div> : <><p className="text-xs text-muted-foreground">Showing up to 100 latest messages.</p>{currentMessages.rows.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_id === me ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] break-words whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.sender_id === me ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {m.body}
                    <div className="text-[10px] opacity-70 mt-1">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}</>}
              <div ref={endRef} />
            </CardContent>
            <div className="border-t p-3 flex gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message…"
                aria-label="Message"
                maxLength={5000}
                disabled={sending || currentMessages?.status !== "ready"}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button onClick={send} aria-label="Send message" className="min-h-11 min-w-11" disabled={sending || !body.trim() || currentMessages?.status !== "ready"}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
