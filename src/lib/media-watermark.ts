// Burns lat/long/timestamp into the image bottom bar (for photos only).
export async function watermarkImage(
  file: File,
  info: { lat?: number; lng?: number; when: Date; brand?: string },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxW = 1920;
      const scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const barH = Math.max(80, Math.round(canvas.height * 0.09));
      const grad = ctx.createLinearGradient(0, canvas.height - barH, 0, canvas.height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.4, "rgba(0,0,0,0.55)");
      grad.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height - barH, canvas.width, barH);

      const pad = Math.round(barH * 0.18);
      const fs = Math.round(barH * 0.28);
      ctx.fillStyle = "#fff";
      ctx.font = `600 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.textBaseline = "top";
      const when = info.when.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      const geo = info.lat != null && info.lng != null
        ? `${info.lat.toFixed(5)}, ${info.lng.toFixed(5)}`
        : "Location unavailable";
      ctx.fillText(`${info.brand ?? "Gabley"} • ${when}`, pad, canvas.height - barH + pad);
      ctx.font = `400 ${Math.round(fs * 0.85)}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(geo, pad, canvas.height - barH + pad + fs + 4);

      canvas.toBlob((b) => {
        URL.revokeObjectURL(url);
        if (b) resolve(b);
        else reject(new Error("Canvas export failed"));
      }, "image/jpeg", 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

export function getBrowserLocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 10_000 },
    );
  });
}
