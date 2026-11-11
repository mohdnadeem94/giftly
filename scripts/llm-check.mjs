// Diagnose the Elf's AI connection. Run from the project folder:
//   node --env-file=.env scripts/llm-check.mjs                      (tests LLM_MODEL from .env)
//   node --env-file=.env scripts/llm-check.mjs model-a model-b ...  (tests each model listed)
// Prints status codes, timings and short replies. Never prints your API key.

const key = process.env.LLM_API_KEY;
const base = (process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, "");
const models = process.argv.slice(2).length ? process.argv.slice(2) : [process.env.LLM_MODEL || "gemini-3.8-flash"];
const effortEnv = process.env.LLM_REASONING_EFFORT;

console.log("Base URL :", base);
console.log("Key set  :", key ? `yes (${key.length} chars)` : "NO");
if (!key) process.exit(1);

const TOOL = {
  type: "function",
  function: {
    name: "search_products",
    description: "Search products",
    parameters: { type: "object", properties: { query: { type: "string" }, max_price_usd: { type: "number" } }, required: ["query"] },
  },
};

async function call(model, effort, label, body) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, ...(effort ? { reasoning_effort: effort } : {}), ...body }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    const ms = Date.now() - t0;
    if (!res.ok) {
      const msg = (Array.isArray(data) ? data[0] : data)?.error?.message ?? JSON.stringify(data).slice(0, 200);
      return `${label}: HTTP ${res.status} in ${ms} ms – ${String(msg).slice(0, 160)}`;
    }
    const m = data.choices?.[0]?.message ?? {};
    const tool = m.tool_calls?.[0]?.function;
    return `${label}: OK in ${ms} ms – ${tool ? `tool_call ${tool.name}(${tool.arguments})` : JSON.stringify(m.content ?? "").slice(0, 80)}`;
  } catch (err) {
    return `${label}: FAILED after ${Date.now() - t0} ms – ${err?.name}: ${err?.message}`;
  }
}

for (const model of models) {
  for (const effort of effortEnv !== undefined ? [effortEnv] : ["", "low"]) {
    console.log(`\n=== ${model}  (reasoning_effort: ${effort || "not sent"}) ===`);
    console.log(await call(model, effort, "plain", { messages: [{ role: "user", content: "Say hello in five words." }] }));
    console.log(
      await call(model, effort, "tool ", {
        messages: [{ role: "user", content: "Find a storybook for a 5 year old under $20." }],
        tools: [TOOL],
        tool_choice: "auto",
      })
    );
  }
}
