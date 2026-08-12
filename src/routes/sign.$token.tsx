import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileSignature, Eraser } from "lucide-react";
import { toast } from "sonner";
import { getSigningContext, submitSignature } from "@/lib/contracts.functions";

export const Route = createFileRoute("/sign/$token")({
  head: () => ({ meta: [{ title: "Sign document — Estately" }, { name: "description", content: "Review and sign your document securely with Estately." }, { name: "robots", content: "noindex" }] }),
  component: SignPage,
});

function fillTemplate(body: string, values: Record<string, any>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => (values?.[k] ?? `_____`).toString());
}

function SignPage() {
  const { token } = Route.useParams();
  const load = useServerFn(getSigningContext);
  const submit = useServerFn(submitSignature);
  const { data, isLoading } = useQuery({ queryKey: ["sign", token], queryFn: () => load({ data: { token } }) });

  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
  }, []);

  const pos = (e: any) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: x * (c.width / r.width), y: y * (c.height / r.height) };
  };
  const onDown = (e: any) => { drawing.current = true; const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const onMove = (e: any) => { if (!drawing.current) return; const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const onUp = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8 text-sm text-destructive">Invalid signing link</div>;

  const sig = data.signature;
  const inst: any = data.instance;
  const tpl = inst?.templates;
  const alreadySigned = sig.status === "signed" || done;

  const submitSig = async () => {
    if (!typed.trim()) { toast.error("Type your full name"); return; }
    const c = canvasRef.current!;
    const dataUrl = c.toDataURL("image/png");
    try {
      await submit({ data: { token, typed_signature: typed.trim(), signature_image_b64: dataUrl } });
      setDone(true);
      toast.success("Signed");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6 text-primary" /> {tpl?.name}</h1>
            <p className="text-sm text-muted-foreground">For: {sig.signer_name} ({sig.signer_role})</p>
          </div>
          <Badge variant={alreadySigned ? "default" : "outline"}>{alreadySigned ? "Signed" : "Awaiting signature"}</Badge>
        </div>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6 prose prose-sm max-w-none whitespace-pre-wrap">
            {fillTemplate(tpl?.body ?? "", inst?.values ?? {})}
            {tpl?.authority && <p className="text-xs text-muted-foreground mt-4 italic">Authority: {tpl.authority}</p>}
          </CardContent>
        </Card>

        {!alreadySigned && (
          <Card className="border-0 shadow-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Your full legal name</Label>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type your name" />
              </div>
              <div>
                <Label>Draw your signature</Label>
                <div className="border rounded-md bg-white relative">
                  <canvas ref={canvasRef} width={800} height={200} className="w-full h-40 touch-none cursor-crosshair"
                    onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                    onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} />
                  <Button size="sm" variant="ghost" onClick={clear} className="absolute top-1 right-1"><Eraser className="h-3 w-3 mr-1" /> Clear</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                By typing your name and drawing your signature, you agree this is an electronic signature legally binding under the Electronic Communications Act 2000 (UK).
              </p>
              <Button className="w-full" onClick={submitSig}><CheckCircle2 className="h-4 w-4 mr-1" /> Sign now</Button>
            </CardContent>
          </Card>
        )}

        {alreadySigned && (
          <Card className="border-0 shadow-card bg-primary/5">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-2" />
              <p className="font-semibold">This document has been signed</p>
              <p className="text-sm text-muted-foreground mt-1">A copy will be sent to all parties.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
