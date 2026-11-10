import { NextResponse } from "next/server";
import { llmConfigured } from "@/lib/llm";
import { MAX_MESSAGE_CHARS, runElf } from "@/lib/elf/agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/elf  { sessionId, messages: [{role:"user"|"assistant", content}], charitySlug? }
export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json({ error: "The Elf isn't configured yet (missing LLM_API_KEY)." }, { status: 503 });
  }

  let body: { sessionId?: unknown; messages?: unknown; charitySlug?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.sessionId) ? body.sessionId : "anon";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastMsg = messages[messages.length - 1] as { content?: unknown } | undefined;
  if (typeof lastMsg?.content !== "string" || lastMsg.content.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `Please keep messages under ${MAX_MESSAGE_CHARS} characters.` }, { status: 400 });
  }

  const result = await runElf({
    sessionId,
    history: messages,
    charitySlug: typeof body.charitySlug === "string" ? body.charitySlug : null,
  });
  return NextResponse.json(result);
}
