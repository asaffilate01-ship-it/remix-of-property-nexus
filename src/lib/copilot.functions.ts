import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM = `You are Gabley Copilot, an assistant for UK letting and estate agents inside the Gabley platform.
Rules:
- Answer using ONLY the live portfolio snapshot supplied in the context block. Never invent numbers.
- If the snapshot does not contain the answer, say so and name the Gabley screen that would (e.g. "Reports → Arrears").
- Use British English, be concise, use short bullet lists, and quote figures in £.
- Give practical next actions an agent can take today. Never give legal advice; refer to a solicitor for tenancy law questions.`;

export const getCopilotSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildCopilotContext } = await import("@/lib/copilot-core.server");
    return { snapshot: await buildCopilotContext(context.supabase, context.userId) };
  });

export const askCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        question: z.string().min(2).max(2000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(12)
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit("ai_copilot", 40, 3_600, context.userId);

    const { buildCopilotContext, contextToPrompt, callCopilotModel } = await import("@/lib/copilot-core.server");
    const snapshot = await buildCopilotContext(context.supabase, context.userId);

    const answer = await callCopilotModel([
      { role: "system", content: SYSTEM },
      { role: "system", content: `Live portfolio snapshot (generated ${new Date().toISOString()}):\n${contextToPrompt(snapshot)}` },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.question },
    ]);

    return { answer, snapshot };
  });
