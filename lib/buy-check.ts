// Server-only: never accept prices or replacement product IDs from the browser.
import { getGiftProduct } from "@/lib/channel3";

type BuyItem = {
  externalId: string | null;
  merchant: string;
  productUrl: string;
  order: { totalCents: number };
};
export type BuyCheck =
  | { action: "CHARGE"; cents: number; merchant: string; productUrl: string; availability?: "IN_STOCK" | "UNKNOWN" | "UNAVAILABLE" }
  | { action: "BLOCK"; reason: "PRICE_UP" | "SOLD_OUT"; liveCents?: number };

export async function checkBeforeBuy(item: BuyItem): Promise<BuyCheck> {
  const held = item.order.totalCents;
  const stored: BuyCheck = { action: "CHARGE", cents: held, merchant: item.merchant, productUrl: item.productUrl };
  // Wishlist gifts have no catalog product to re-check; simulation must not affect them.
  if (!item.externalId) return stored;
  if (process.env.NODE_ENV !== "production") {
    switch (process.env.BUY_CHECK_SIMULATE) {
      case "cheaper": return { ...stored, cents: Math.max(1, held - 100), availability: "IN_STOCK" };
      case "pricier": return { action: "BLOCK", reason: "PRICE_UP", liveCents: held + 500 };
      case "soldout": return { action: "BLOCK", reason: "SOLD_OUT" };
    }
  }
  try {
    const product = await getGiftProduct(item.externalId);
    if (!product || product.inStock === false) return { action: "BLOCK", reason: "SOLD_OUT" };
    // Refuse an unexpected identity rather than buying a different product.
    if (product.id !== item.externalId) return { action: "BLOCK", reason: "SOLD_OUT" };
    if (product.priceCents > held) return { action: "BLOCK", reason: "PRICE_UP", liveCents: product.priceCents };
    return { action: "CHARGE", cents: product.priceCents, merchant: product.merchant, productUrl: product.productUrl, availability: product.inStock === true ? "IN_STOCK" : "UNKNOWN" };
  } catch {
    console.warn("Buy check: Channel3 unavailable; using the stored donor-approved price.");
    return { ...stored, availability: "UNAVAILABLE" };
  }
}
