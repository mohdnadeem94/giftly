// The Elf's tools. Every tool runs on the server, and every argument is validated here in code.
// The model can only SUGGEST: no tool creates payments or changes amounts.
import { NeedStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { searchGiftProducts, type GiftProduct } from "@/lib/channel3";
import type { ToolSpec } from "@/lib/llm";

export const ELF_TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search real stores for child-appropriate gift products with live prices. Unsafe items are filtered out automatically.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Short shopping query, e.g. 'storybook for 5 year old girl'" },
          max_price_usd: { type: "number", description: "Donor's budget per gift in USD (1 to 500)" },
          age: { type: "number", description: "Child's age in years, if known" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_causes",
      description: "List Giftly's charities with category, region, and their open wishlist items.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_charity_info",
      description: "Get one charity's own story, FAQ, region and wishlist. Answer charity questions only from this.",
      parameters: {
        type: "object",
        properties: { charity_slug: { type: "string" } },
        required: ["charity_slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_gifts",
      description:
        "Show the donor 2 or 3 gift products (from your search_products results in this turn) as cards they can approve. This does NOT pay.",
      parameters: {
        type: "object",
        properties: {
          charity_slug: { type: "string", description: "Charity that will receive and deliver the gift" },
          picks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string" },
                reason: { type: "string", description: "Why it fits, max 15 words" },
              },
              required: ["product_id", "reason"],
            },
          },
        },
        required: ["charity_slug", "picks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_cash",
      description: "Show the donor a button to give cash to a charity. The donor chooses the amount; you never do.",
      parameters: {
        type: "object",
        properties: {
          charity_slug: { type: "string" },
          reason: { type: "string", description: "One sentence on why cash fits here" },
        },
        required: ["charity_slug", "reason"],
      },
    },
  },
];

export type GiftPick = GiftProduct & { reason: string };
export type GiftCards = { charitySlug: string; charityName: string; picks: GiftPick[] };
export type CashSuggestion = { charitySlug: string; charityName: string; reason: string };

/** State gathered while the Elf works on one donor message. */
export type TurnState = {
  searched: Map<string, GiftProduct>; // products returned by search_products in THIS turn
  cards: GiftCards | null;
  cash: CashSuggestion | null;
  toolLog: { name: string; args: Record<string, unknown>; ok: boolean; note?: string }[];
};

export function newTurnState(): TurnState {
  return { searched: new Map(), cards: null, cash: null, toolLog: [] };
}

const MAX_BUDGET = 500;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function charityBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  return db.charity.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } });
}

/** Run one tool call. Returns the JSON string sent back to the model. */
export async function runTool(name: string, rawArgs: string, state: TurnState): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    state.toolLog.push({ name, args: {}, ok: false, note: "bad JSON" });
    return JSON.stringify({ error: "Arguments were not valid JSON." });
  }

  try {
    switch (name) {
      case "search_products": {
        let query = str(args.query, 100);
        const age = Number(args.age);
        if (Number.isFinite(age) && age >= 0 && age <= 17 && !/\d/.test(query)) query = `${query} for ${Math.round(age)} year old`;
        if (query.length < 2) return JSON.stringify({ error: "Query is too short." });

        let budget = Number(args.max_price_usd);
        let note: string | undefined;
        if (!Number.isFinite(budget) || budget <= 0) budget = 50;
        if (budget > MAX_BUDGET) {
          note = `Budget capped at $${MAX_BUDGET} per gift in this demo.`;
          budget = MAX_BUDGET;
        }

        const products = await searchGiftProducts({ query, maxCents: Math.round(budget * 100), limit: 6 });
        for (const p of products) state.searched.set(p.id, p);
        state.toolLog.push({ name, args: { query, max_price_usd: budget }, ok: true, note: `${products.length} results` });

        // Send the model only what it needs (short titles, no descriptions) to limit prompt-injection surface.
        return JSON.stringify({
          note,
          results: products.map((p) => ({
            product_id: p.id,
            title: p.title.slice(0, 120),
            price_usd: p.priceCents / 100,
            store: p.merchant,
            in_stock: p.inStock,
          })),
          ...(products.length === 0 ? { hint: "No safe products found within budget. Consider suggesting cash." } : {}),
        });
      }

      case "list_causes": {
        const charities = await db.charity.findMany({
          orderBy: { name: "asc" },
          select: {
            slug: true,
            name: true,
            category: true,
            region: true,
            needs: {
              where: { status: { not: NeedStatus.FULFILLED } },
              select: { title: true, ageGroup: true, targetPriceCents: true },
            },
          },
        });
        state.toolLog.push({ name, args: {}, ok: true });
        return JSON.stringify(
          charities.map((c) => ({
            charity_slug: c.slug,
            name: c.name,
            category: c.category,
            region: c.region,
            wishlist: c.needs.map((n) => ({ item: n.title, ages: n.ageGroup, price_usd: n.targetPriceCents / 100 })),
          }))
        );
      }

      case "get_charity_info": {
        const slug = str(args.charity_slug, 60);
        const c = await db.charity.findUnique({
          where: { slug },
          select: {
            name: true,
            category: true,
            region: true,
            story: true,
            faqText: true,
            needs: {
              where: { status: { not: NeedStatus.FULFILLED } },
              select: { title: true, ageGroup: true, targetPriceCents: true },
            },
          },
        });
        state.toolLog.push({ name, args: { charity_slug: slug }, ok: !!c });
        if (!c) return JSON.stringify({ error: "Unknown charity. Call list_causes to see valid slugs." });
        return JSON.stringify({
          name: c.name,
          category: c.category,
          region: c.region,
          story: c.story,
          faq: c.faqText,
          wishlist: c.needs.map((n) => ({ item: n.title, ages: n.ageGroup, price_usd: n.targetPriceCents / 100 })),
          reminder: "Answer only from this text. If the answer is missing, say: The charity hasn't shared that.",
        });
      }

      case "recommend_gifts": {
        const charity = await charityBySlug(str(args.charity_slug, 60));
        if (!charity) {
          state.toolLog.push({ name, args, ok: false, note: "unknown charity" });
          return JSON.stringify({ error: "Unknown charity_slug. Call list_causes first." });
        }
        const rawPicks = Array.isArray(args.picks) ? args.picks : [];
        const picks: GiftPick[] = [];
        for (const raw of rawPicks) {
          const id = str((raw as Record<string, unknown>)?.product_id, 100);
          const product = state.searched.get(id); // ONLY products we actually fetched this turn
          if (!product || picks.some((p) => p.id === id)) continue;
          picks.push({ ...product, reason: str((raw as Record<string, unknown>)?.reason, 140) || "A thoughtful pick." });
          if (picks.length === 3) break;
        }
        if (picks.length === 0) {
          state.toolLog.push({ name, args: { charity_slug: charity.slug }, ok: false, note: "no valid picks" });
          return JSON.stringify({ error: "None of those product_ids came from search_products in this turn." });
        }
        state.cards = { charitySlug: charity.slug, charityName: charity.name, picks };
        state.toolLog.push({ name, args: { charity_slug: charity.slug, picks: picks.map((p) => p.id) }, ok: true });
        return JSON.stringify({ shown_to_donor: picks.length, charity: charity.name });
      }

      case "suggest_cash": {
        const charity = await charityBySlug(str(args.charity_slug, 60));
        if (!charity) {
          state.toolLog.push({ name, args, ok: false, note: "unknown charity" });
          return JSON.stringify({ error: "Unknown charity_slug. Call list_causes first." });
        }
        state.cash = { charitySlug: charity.slug, charityName: charity.name, reason: str(args.reason, 200) };
        state.toolLog.push({ name, args: { charity_slug: charity.slug }, ok: true });
        return JSON.stringify({ shown_to_donor: true, charity: charity.name, note: "The donor chooses the amount." });
      }

      default:
        state.toolLog.push({ name, args, ok: false, note: "unknown tool" });
        return JSON.stringify({ error: `Unknown tool ${name}.` });
    }
  } catch (err) {
    console.error(`Elf tool ${name} failed`, err);
    state.toolLog.push({ name, args, ok: false, note: "tool error" });
    return JSON.stringify({ error: "That tool failed. Try again or continue without it." });
  }
}
