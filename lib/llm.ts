// Minimal OpenAI-compatible chat client with model fallback (server only).
// Works with Gemini's OpenAI-compatible endpoint (default) and with Groq, by changing env vars:
//   LLM_API_KEY
//   LLM_BASE_URL          optional (default: Gemini OpenAI-compatible endpoint)
//   LLM_MODEL             optional, comma-separated list tried in order, e.g. "gemini-3.1-flash-lite,gemini-flash-latest"
//   LLM_REASONING_EFFORT  optional: low | medium | high | none (default "low" on Gemini, unset elsewhere)
// If a model is overloaded (503), rate-limited (429), missing (404) or too slow, the next model is tried,
// and the failing model is skipped for a short cool-down.
// Docs: https://ai.google.dev/gemini-api/docs/openai
// Note: newer Gemini models reject temperature/top_p/top_k, so we never send them.

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.5-flash", "gemini-3.8-flash"];
const COOLDOWN_MS = 2 * 60 * 1000;
const RETRYABLE = new Set([404, 408, 429, 500, 502, 503, 504]);

export class LLMError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

/** Messages are kept as plain objects so provider-specific fields (e.g. Gemini thought signatures) round-trip untouched. */
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | Array<Record<string, unknown>> }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[]; [extra: string]: unknown }
  | { role: "tool"; tool_call_id: string; name?: string; content: string };

export type ToolSpec = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type AssistantMessage = { role: "assistant"; content: string | null; tool_calls?: ToolCall[]; [extra: string]: unknown };

export function llmConfigured(): boolean {
  return !!process.env.LLM_API_KEY;
}

function config() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new LLMError("LLM_API_KEY is not configured", 503);
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const isGemini = baseUrl.includes("generativelanguage.googleapis.com");
  const fromEnv = (process.env.LLM_MODEL || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const models = fromEnv.length ? fromEnv : isGemini ? DEFAULT_GEMINI_MODELS : [];
  if (!models.length) throw new LLMError("LLM_MODEL is not configured", 503);
  const effort = process.env.LLM_REASONING_EFFORT ?? (isGemini ? "low" : "");
  return { apiKey, baseUrl, models, effort };
}

export function configuredModels(): string[] {
  try {
    return config().models;
  } catch {
    return [];
  }
}

// Models that recently failed are skipped for a while (per server process).
const coolingUntil = new Map<string, number>();

async function callOnce(
  model: string,
  opts: { messages: ChatMessage[]; tools?: ToolSpec[]; jsonMode?: boolean; timeoutMs: number }
): Promise<AssistantMessage> {
  const { apiKey, baseUrl, effort } = config();
  const body: Record<string, unknown> = { model, messages: opts.messages };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = "auto";
  }
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  if (effort) body.reasoning_effort = effort;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new LLMError(`${model}: ${timedOut ? "timed out" : (err as Error).message}`, timedOut ? 408 : 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LLMError(`${model}: HTTP ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  const data = (await res.json()) as { choices?: { message?: Record<string, unknown> }[] };
  const message = data.choices?.[0]?.message;
  if (!message) throw new LLMError(`${model}: returned no message`, 502);

  // Normalize content to string | null.
  let content = message.content as unknown;
  if (Array.isArray(content)) {
    content = content
      .map((part) => (typeof part === "string" ? part : ((part as { text?: string })?.text ?? "")))
      .join("");
  }
  const toolCalls = Array.isArray(message.tool_calls)
    ? (message.tool_calls as ToolCall[]).map((tc, i) => ({ ...tc, id: tc.id || `call_${Date.now()}_${i}`, type: "function" as const }))
    : undefined;

  return { ...message, role: "assistant", content: (content as string | null) ?? null, tool_calls: toolCalls };
}

/**
 * One chat completion, trying each configured model in order until one answers.
 * Pass `preferModel` to try a specific model first (e.g. the one already used in this conversation turn).
 */
export async function chat(opts: {
  messages: ChatMessage[];
  tools?: ToolSpec[];
  jsonMode?: boolean;
  timeoutMs?: number;
  preferModel?: string;
}): Promise<AssistantMessage & { model: string }> {
  const { models } = config();
  const now = Date.now();
  const ordered = [
    ...(opts.preferModel && models.includes(opts.preferModel) ? [opts.preferModel] : []),
    ...models.filter((m) => m !== opts.preferModel && (coolingUntil.get(m) ?? 0) < now),
  ];
  if (!ordered.length) ordered.push(...models); // everything cooling down: try anyway

  let lastError: LLMError | null = null;
  for (const model of ordered) {
    try {
      const msg = await callOnce(model, { ...opts, timeoutMs: opts.timeoutMs ?? 25000 });
      coolingUntil.delete(model);
      return { ...msg, model };
    } catch (err) {
      const e = err instanceof LLMError ? err : new LLMError(String(err));
      lastError = e;
      if (e.status && RETRYABLE.has(e.status)) {
        coolingUntil.set(model, Date.now() + COOLDOWN_MS);
        console.warn(`LLM model ${model} failed (${e.status}), trying next`);
        continue;
      }
      throw e; // e.g. 400 bad request or 401 bad key: don't hide it
    }
  }
  throw lastError ?? new LLMError("No LLM model available", 503);
}
