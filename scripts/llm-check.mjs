// Diagnose the Elf's AI connection. Run from the project folder:
//   node --env-file=.env scripts/llm-check.mjs
// Prints status codes, timings and error messages. Never prints your API key.

const key = process.env.LLM_API_KEY;
const base = (process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, "");
const model = process.env.LLM_MODEL || "gemini-3.8-flash";
const effort = process.env.LLM_REASONING_EFFORT ?? (base.includes("generativelanguage.googleapis.com") ? "low" : "");

console.log("Base URL :", base);
console.log("Model    :", model);
console.log("Effort   :", effort || "(not sent)");
console.log("Key set  :", key ? `yes (${key.length} chars, starts ${key.slice(0, 4)}…)` : "NO");
if (!key) process.exit(1);

async function call(label, body) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, ...(effort ? { reasoning_effort: effort } : {}), ...body }),
      signal: AbortSignal.timeout(60000),
    });
    const text = await res.text();
    console.log(`\n[${label}] HTTP ${res.status} in ${Date.now() - t0} ms`);
    console.log(text.slice(0, 800));
  } catch (err) {
    console.log(`\n[${label}] FAILED after ${Date.now() - t0} ms: ${err?.name}: ${err?.message}`);
  }
}

// 1. List models (checks the key and the endpoint)
{
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) });
    const data = await res.json().catch(() => ({}));
    const ids = (data.data || []).map((m) => m.id).filter((id) => /flash|llama|qwen|gpt/i.test(id));
    console.log(`\n[models] HTTP ${res.status} in ${Date.now() - t0} ms`);
    console.log(ids.length ? ids.slice(0, 25).join("\n") : JSON.stringify(data).slice(0, 500));
  } catch (err) {
    console.log(`\n[models] FAILED: ${err?.name}: ${err?.message}`);
  }
}

// 2. Plain chat
await call("plain chat", { messages: [{ role: "user", content: "Say hello in five words." }] });

// 3. Chat with a tool
await call("tool call", {
  messages: [{ role: "user", content: "Find a storybook for a 5 year old under $20." }],
  tools: [
    {
      type: "function",
      function: {
        name: "search_products",
        description: "Search products",
        parameters: { type: "object", properties: { query: { type: "string" }, max_price_usd: { type: "number" } }, required: ["query"] },
      },
    },
  ],
  tool_choice: "auto",
});
