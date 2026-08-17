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
import { Send, Plus, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Gabley" }] }),
  component: Inbox,
});

function Inbox() {
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    const { data } = await supabase
      .from("message_threads")
      .select("*")
      .order("last_message_at", { ascending: false });
    setThreads(data ?? []);
  };
  const loadMessages = async (threadId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMe(user?.id ?? null);
      await loadThreads();
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    loadMessages(active.id);
    const ch = supabase
      .channel(`thread:${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${active.id}`,
        },
        (p) => setMessages((m) => [...m, p.new as any]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [active]);

  const send = async () => {
    if (!body.trim() || !active || !me) return;
    const text = body;
    setBody("");
    const { error } = await supabase
      .from("messages")
      .insert({ thread_id: active.id, sender_id: me, body: text });
    if (error) {
      toast.error(error.message);
      setBody(text);
    }
  };

  const createThread = async () => {
    if (!newSubject || !me) return;
    let participantId: string | null = null;
    if (newEmail) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${newEmail}%`)
        .maybeSingle();
      participantId = p?.id ?? null;
    }
    const { data: agencies } = await supabase
      .from("agencies")
      .select("id")
      .eq("owner_id", me)
      .limit(1);
    const { data: t, error } = await supabase
      .from("message_threads")
      .insert({
        subject: newSubject,
        created_by: me,
        agency_id: agencies?.[0]?.id ?? null,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    if (participantId)
      await supabase
        .from("thread_participants")
        .insert({ thread_id: t!.id, user_id: participantId });
    setNewOpen(false);
    setNewSubject("");
    setNewEmail("");
    await loadThreads();
    setActive(t);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      <Card className="w-80 flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Inbox</CardTitle>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                </div>
                <div>
                  <Label>Add participant (name search, optional)</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createThread}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {threads.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-muted ${active?.id === t.id ? "bg-muted" : ""}`}
            >
              <div className="font-medium text-sm">{t.subject}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(t.last_message_at).toLocaleString()}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2" />
            Select a conversation
          </div>
        ) : (
          <>
            <CardHeader className="border-b">
              <CardTitle className="text-base">{active.subject}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2 py-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_id === me ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md rounded-2xl px-3 py-2 text-sm ${m.sender_id === me ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {m.body}
                    <div className="text-[10px] opacity-70 mt-1">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </CardContent>
            <div className="border-t p-3 flex gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message…"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button onClick={send}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
