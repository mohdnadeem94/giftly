// What a donor is paying for, resolved from OUR database (server only).
// The amount for a gift always comes from the database. The amount for cash is the donor's
// own choice, validated here on the server (1 to 500 USD).
import { NeedStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const CASH_MIN_CENTS = 100;
export const CASH_MAX_CENTS = 50000;
export const GIFT_MAX_CENTS = 50000;

export class GivingError extends Error {}

/** A compact description of what is being paid for. Stored in the PayPal order's custom_id. */
export type GivingSpec =
  | { kind: "cash"; charityId: string; cents: number }
  | { kind: "need"; needId: string }
  | { kind: "item"; orderItemId: string }; // a product draft created from Channel3 search

export type ResolvedGiving = {
  spec: GivingSpec;
  type: "CASH" | "GIFT";
  charityId: string;
  charityName: string;
  amountCents: number;
  need: { id: string; title: string; ageGroup: string; priceCents: number } | null;
  draft: {
    orderId: string;
    itemId: string;
    title: string;
    externalId: string | null;
    itemStatus: string;
    orderStatus: string;
  } | null;
  description: string;
};

export function encodeSpec(spec: GivingSpec): string {
  if (spec.kind === "cash") return `giftly:cash:${spec.charityId}:${spec.cents}`;
  if (spec.kind === "need") return `giftly:need:${spec.needId}`;
  return `giftly:item:${spec.orderItemId}`;
}

export function decodeSpec(customId: string): GivingSpec | null {
  const parts = customId.split(":");
  if (parts[0] !== "giftly") return null;
  if (parts[1] === "cash" && parts.length === 4) {
    const cents = Number(parts[3]);
    return Number.isInteger(cents) ? { kind: "cash", charityId: parts[2], cents } : null;
  }
  if (parts[1] === "need" && parts.length === 3) return { kind: "need", needId: parts[2] };
  if (parts[1] === "item" && parts.length === 3) return { kind: "item", orderItemId: parts[2] };
  return null;
}

export async function resolveGiving(spec: GivingSpec): Promise<ResolvedGiving> {
  if (spec.kind === "cash") {
    if (!Number.isInteger(spec.cents) || spec.cents < CASH_MIN_CENTS || spec.cents > CASH_MAX_CENTS) {
      throw new GivingError("Please choose an amount between $1 and $500.");
    }
    const charity = await db.charity.findUnique({ where: { id: spec.charityId }, select: { id: true, name: true } });
    if (!charity) throw new GivingError("That charity could not be found.");
    return {
      spec,
      type: "CASH",
      charityId: charity.id,
      charityName: charity.name,
      amountCents: spec.cents,
      need: null,
      draft: null,
      description: `Giftly cash donation to ${charity.name}`,
    };
  }

  if (spec.kind === "item") {
    const item = await db.orderItem.findUnique({
      where: { id: spec.orderItemId },
      select: {
        id: true,
        status: true,
        productTitle: true,
        externalId: true,
        priceAtRecommendationCents: true,
        order: { select: { id: true, status: true, charity: { select: { id: true, name: true } } } },
      },
    });
    if (!item) throw new GivingError("That gift could not be found. Please pick it again.");
    return {
      spec,
      type: "GIFT",
      charityId: item.order.charity.id,
      charityName: item.order.charity.name,
      amountCents: item.priceAtRecommendationCents,
      need: null,
      draft: {
        orderId: item.order.id,
        itemId: item.id,
        title: item.productTitle,
        externalId: item.externalId,
        itemStatus: item.status,
        orderStatus: item.order.status,
      },
      description: `Giftly gift: ${item.productTitle} for ${item.order.charity.name}`,
    };
  }

  const need = await db.need.findUnique({
    where: { id: spec.needId },
    select: {
      id: true,
      title: true,
      ageGroup: true,
      targetPriceCents: true,
      status: true,
      charity: { select: { id: true, name: true } },
    },
  });
  if (!need) throw new GivingError("That gift could not be found.");
  if (need.status === NeedStatus.FULFILLED) throw new GivingError("That gift has already been fulfilled.");
  return {
    spec,
    type: "GIFT",
    charityId: need.charity.id,
    charityName: need.charity.name,
    amountCents: need.targetPriceCents,
    need: { id: need.id, title: need.title, ageGroup: need.ageGroup, priceCents: need.targetPriceCents },
    draft: null,
    description: `Giftly gift: ${need.title} for ${need.charity.name}`,
  };
}
