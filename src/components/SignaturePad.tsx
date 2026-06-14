import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

type Props = {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
};

export function SignaturePad({ onChange, height = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
  }, []);

  const pos = (e: any) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: (x * c.width) / r.width, y: (y * c.height) / r.height };
  };
  const start = (e: any) => { e.preventDefault(); drawing.current = true; const { x, y } = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e: any) => { if (!drawing.current) return; e.preventDefault(); const { x, y } = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.lineTo(x, y); ctx.stroke(); hasInk.current = true; };
  const end = () => {
    drawing.current = false;
    if (hasInk.current) onChange?.(canvasRef.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height); hasInk.current = false; onChange?.(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full rounded-md border bg-white touch-none"
        style={{ height }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <Button type="button" variant="ghost" size="sm" onClick={clear}><Eraser className="h-3 w-3 mr-1" /> Clear</Button>
    </div>
  );
}
