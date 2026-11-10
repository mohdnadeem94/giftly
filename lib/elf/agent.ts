// The Elf's agent loop (server only): model -> tools -> model, at most a few rounds.
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chat, LLMError, type ChatMessage } from "@/lib/llm";
import { ELF_SYSTEM_PROMPT } from "./prompt";
import { ELF_TOOLS, newTurnState, runTool, type CashSuggestion, type GiftCards } from "./tools";

const MAX_ROUNDS = 5;
export const MAX_MESSAGE_CHARS = 600;
export const MAX_HISTORY = 12;

export type ElfHistoryItem = { role: "user" | "assistant"; content: string };

export type ElfResult = {
  reply: string;
  cards: GiftCards | null;
  cash: CashSuggestion | null;
  tools: string[];
  error?: "busy" | "unavailable";
  debug?: string;
};

function sanitizeHistory(history: unknown): ElfHistoryItem[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m): m is ElfHistoryItem =>
        !!m &&
        typeof m === "object" &&
        ((m as ElfHistoryItem).role === "user" || (m as ElfHistoryItem).role === "assistant") &&
        typeof (m as ElfHistoryItem).content === "string"
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
}

export async function runElf(opts: { sessionId: string; history: unknown; charitySlug?: string | null }): Promise<ElfResult> {
  const history = sanitizeHistory(opts.history);
  const last = history[history.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return { reply: "Tell me who you'd like to help, and I'll find a gift or the right cause.", cards: null, cash: null, tools: [] };
  }

  let context = `Today is ${new Date().toDateString()}. Currency: USD.`;
  if (opts.charitySlug && /^[a-z0-9-]{1,60}$/.test(opts.charitySlug)) {
    const c = await db.charity.findUnique({ where: { slug: opts.charitySlug }, select: { slug: true, name: true } });
    if (c) context += ` The donor is currently viewing the charity "${c.name}" (charity_slug: ${c.slug}). Prefer it unless the request clearly fits another cause.`;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: ELF_SYSTEM_PROMPT },
    { role: "system", content: context },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ];

  const state = newTurnState();
  let reply = "";

  try {
    let model: string | undefined;
    let nudged = false;
    for (let round = 0; round < MAX_ROUNDS + 1; round++) {
      // Stick with the model that answered first in this turn (falls back automatically if it fails).
      const { model: usedModel, ...msg } = await chat({ messages, tools: ELF_TOOLS, preferModel: model });
      model = usedModel;
      messages.push(msg as ChatMessage); // keep the raw message (provider fields like thought signatures must round-trip)

      if (!msg.tool_calls?.length) {
        reply = (msg.content ?? "").trim();
        // It found real products but didn't show any: nudge it once to call recommend_gifts.
        if (!nudged && state.searched.size > 0 && !state.cards && !state.cash) {
          nudged = true;
          messages.push({
            role: "user",
            content:
              "(Giftly app note, not from the donor: you searched products but did not show any. Call recommend_gifts now with the 2 or 3 best product_ids from your search results and the best-fitting charity_slug from list_causes, then reply in 1-2 short sentences without listing products or prices.)",
          });
          continue;
        }
        break;
      }
      for (const call of msg.tool_calls) {
        const result = await runTool(call.function.name, call.function.arguments, state);
        messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: result });
      }
    }
  } catch (err) {
    const status = err instanceof LLMError ? err.status : undefined;
    console.error("Elf failed", err);
    const busy = status === 429 || status === 503 || status === 408;
    return {
      reply: busy
        ? "The AI service is very busy right now. Please try again in a minute, or browse the causes directly."
        : "Sorry, I couldn't think that through just now. Please try again, or browse the causes directly.",
      cards: state.cards,
      cash: state.cash,
      tools: state.toolLog.map((t) => t.name),
      error: busy ? "busy" : "unavailable",
      // Local development only: show the real cause to help debugging. Never sent in production.
      ...(process.env.NODE_ENV !== "production" ? { debug: err instanceof Error ? err.message.slice(0, 600) : String(err) } : {}),
    };
  }

  if (!reply) {
    reply = state.cards
      ? "Here are a few gifts I'd suggest."
      : state.cash
        ? "Here's where cash would do the most good."
        : "Could you tell me the child's age and your budget?";
  }
  // Belt and braces: keep replies short and plain (strip markdown bold, bullets and headings).
  reply = reply
    .replace(/\*\*/g, "")
    .replace(/^\s*[*\-•]\s+/gm, "• ")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 900);

  // Transparency log (no child data is collected; the donor's message is stored truncated).
  try {
    await db.agentLog.create({
      data: {
        sessionId: opts.sessionId.slice(0, 64),
        userMessage: last.content.slice(0, MAX_MESSAGE_CHARS),
        toolsCalled: JSON.parse(JSON.stringify(state.toolLog)) as Prisma.InputJsonValue,
        summary: [
          reply.slice(0, 300),
          state.cards ? `[gifts: ${state.cards.picks.map((p) => p.title.slice(0, 40)).join(" | ")} -> ${state.cards.charitySlug}]` : "",
          state.cash ? `[cash -> ${state.cash.charitySlug}]` : "",
        ]
          .filter(Boolean)
          .join(" "),
      },
    });
  } catch (err) {
    console.error("AgentLog write failed", err);
  }

  return { reply, cards: state.cards, cash: state.cash, tools: state.toolLog.map((t) => t.name) };
}
