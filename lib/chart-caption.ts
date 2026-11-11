// One-line AI summary of the charts, written ONLY from the numbers we pass in (server only).
import { chat } from "@/lib/llm";
import type { ChartData } from "@/lib/chart-data";

const cache = new Map<string, { text: string; at: number }>();
const TTL_MS = 10 * 60 * 1000; // reuse for 10 minutes to save AI quota

export async function getChartCaption(data: ChartData): Promise<string | null> {
  const facts = {
    scope: data.scope?.name ?? "All causes on Giftly",
    total_raised_usd: data.totals.raised,
    cash_usd: data.totals.cash,
    gifts_usd: data.totals.gifts,
    gifts_given: data.totals.giftCount,
    gifts_delivered: data.totals.delivered,
    donations: data.totals.donations,
    days_with_donations: data.totals.days,
    top_causes: data.topCauses.slice(0, 3).map((c) => ({ cause: c.cause, usd: c.amount })),
    by_category: data.byCategory.map((c) => ({ category: c.category, usd: c.amount })),
    last_7_days_usd:
      data.raisedOverTime.length > 0
        ? Math.round(
            (data.raisedOverTime[data.raisedOverTime.length - 1].total -
              (data.raisedOverTime.find((d) => new Date(d.date) >= new Date(Date.now() - 7 * 864e5))?.total ?? 0)) *
              100
          ) / 100
        : 0,
  };
  const key = JSON.stringify(facts);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.text;

  try {
    const { content } = await chat({
      timeoutMs: 15000,
      messages: [
        {
          role: "system",
          content:
            "Write ONE short, friendly sentence (max 30 words) summarizing these giving statistics for a public dashboard. " +
            "Use only the numbers given; never invent or estimate numbers. Round dollars to whole numbers with a $ sign. " +
            "Plain text, no markdown, no emoji.",
        },
        { role: "user", content: JSON.stringify(facts) },
      ],
    });
    const text = (content ?? "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    if (text.length < 10) return null;
    const line = text.slice(0, 240);
    cache.set(key, { text: line, at: Date.now() });
    return line;
  } catch (err) {
    console.warn("chart caption failed", err);
    return null;
  }
}
