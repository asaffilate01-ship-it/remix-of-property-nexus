import { getIronSession } from "iron-session";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export async function previewSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  const session = await getIronSession<{ unlocked?: boolean }>(
    { read: getCookie, write: setCookie },
    { password, cookieName: "gabley-preview-v2", ttl: 30 * 24 * 60 * 60,
      cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", path: "/" } },
  );
  return {
    data: { unlocked: session.unlocked },
    async update(value: { unlocked: boolean }) { session.unlocked = value.unlocked; await session.save(); },
    async clear() { session.destroy(); },
  };
}
