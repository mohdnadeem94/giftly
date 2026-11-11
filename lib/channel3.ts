// Channel3 product search (server only). Uses the REST API directly:
//   POST https://api.trychannel3.com/v1/search        (x-api-key header)
//   GET  https://api.trychannel3.com/v1/products/{id}
// Docs: https://docs.trychannel3.com  ·  Product text is untrusted: we only display it, never follow it.
import { isUnsafeForChildren } from "@/lib/safety";

const BASE_URL = "https://api.trychannel3.com/v1";

export class Channel3Error extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

type RawPrice = { price?: number; compare_at_price?: number | null; currency?: string };
type RawOffer = { url?: string; domain?: string; price?: RawPrice; availability?: string | null };
type RawImage = { url?: string; is_cleaned_image?: boolean | null };
type RawProduct = {
  id?: string;
  title?: string;
  description?: string | null;
  brands?: { id?: string; name?: string }[] | null;
  images?: RawImage[] | null;
  offers?: RawOffer[] | null;
};

/** The normalized product we show and store. Prices are integer cents, USD only. */
export type GiftProduct = {
  id: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  priceCents: number;
  compareAtCents: number | null;
  merchant: string;
  productUrl: string;
  inStock: boolean | null;
};

function apiKey(): string {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) throw new Channel3Error("CHANNEL3_API_KEY is not configured", 503);
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "x-api-key": apiKey(), "content-type": "application/json", accept: "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Channel3Error(`Channel3 ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  return (await res.json()) as T;
}

function toCents(dollars: number | null | undefined): number | null {
  return typeof dollars === "number" && Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : null;
}

function isInStock(o: RawOffer): boolean | null {
  const availability = (o.availability ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (availability === "instock") return true;
  if (["outofstock", "soldout", "unavailable"].includes(availability)) return false;
  return null;
}

/** Turn a raw Channel3 product into a GiftProduct, or null if it's unsafe, not in USD, or over budget. */
export function normalizeProduct(p: RawProduct, maxCents?: number): GiftProduct | null {
  if (!p?.id || !p.title) return null;

  const brand = p.brands?.find((b) => b?.name)?.name ?? null;
  const text = [p.title, p.description ?? "", brand ?? ""].join(" ");
  if (isUnsafeForChildren(text)) return null;

  const offers = (p.offers ?? [])
    .filter((o) => o?.url && (o.price?.currency ?? "USD").toUpperCase() === "USD" && toCents(o.price?.price) !== null)
    .filter((o) => !maxCents || (toCents(o.price?.price) as number) <= maxCents)
    .sort((a, b) => {
      const rank = (o: RawOffer) => isInStock(o) === true ? 2 : isInStock(o) === null ? 1 : 0;
      const stock = rank(b) - rank(a); // in stock first
      return stock !== 0 ? stock : (toCents(a.price?.price) as number) - (toCents(b.price?.price) as number);
    });
  const best = offers[0];
  if (!best) return null;

  const images = p.images ?? [];
  const imageUrl = images.find((i) => i?.is_cleaned_image && i.url)?.url ?? images.find((i) => i?.url)?.url ?? null;
  const priceCents = toCents(best.price?.price) as number;
  const compareAt = toCents(best.price?.compare_at_price);

  return {
    id: p.id,
    title: p.title.slice(0, 200),
    brand,
    imageUrl,
    priceCents,
    compareAtCents: compareAt && compareAt > priceCents ? compareAt : null,
    merchant: (best.domain ?? "").replace(/^www\./, "") || "Online store",
    productUrl: best.url as string,
    inStock: isInStock(best),
  };
}

/** Search Channel3 for child-appropriate gifts within a budget. */
export async function searchGiftProducts(opts: { query: string; maxCents?: number; limit?: number }): Promise<GiftProduct[]> {
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 12);
  const body: Record<string, unknown> = {
    query: opts.query,
    limit: Math.min(30, limit * 2 + 4), // ask for extra: some get filtered out
  };
  if (opts.maxCents) body.filters = { price: { max_price: opts.maxCents / 100 } };

  const data = await call<{ products?: RawProduct[] }>("/search", { method: "POST", body: JSON.stringify(body) });

  const seen = new Set<string>();
  const out: GiftProduct[] = [];
  for (const raw of data.products ?? []) {
    const p = normalizeProduct(raw, opts.maxCents);
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/** Fetch one product's live data (used when a donor picks it, and to re-check the price). */
export async function getGiftProduct(id: string): Promise<GiftProduct | null> {
  if (!/^[A-Za-z0-9_\-:.]{1,100}$/.test(id)) return null;
  try {
    const raw = await call<RawProduct>(`/products/${encodeURIComponent(id)}`);
    return normalizeProduct(raw);
  } catch (err) {
    if (err instanceof Channel3Error && err.status === 404) return null;
    throw err;
  }
}
