// What a donor is paying for, resolved from OUR database (server only).
// The amount for a gift always comes from the database. The amount for cash is the donor's
// own choice, validated here on the server (1 to 500 USD).
import { NeedStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const CASH_MIN_CENTS = 100;
export const CASH_MAX_CENTS = 50000;

export class GivingError extends Error {}

/** A compact description of what is being paid for. Stored in the PayPal order's custom_id. */
export type GivingSpec = { kind: "cash"; charityId: string; cents: number } | { kind: "need"; needId: string };

export type ResolvedGiving = {
  spec: GivingSpec;
  type: "CASH" | "GIFT";
  charityId: string;
  charityName: string;
  amountCents: number;
  need: { id: string; title: string; ageGroup: string; priceCents: number } | null;
  description: string;
};

export function encodeSpec(spec: GivingSpec): string {
  return spec.kind === "cash" ? `giftly:cash:${spec.charityId}:${spec.cents}` : `giftly:need:${spec.needId}`;
}

export function decodeSpec(customId: string): GivingSpec | null {
  const parts = customId.split(":");
  if (parts[0] !== "giftly") return null;
  if (parts[1] === "cash" && parts.length === 4) {
    const cents = Number(parts[3]);
    return Number.isInteger(cents) ? { kind: "cash", charityId: parts[2], cents } : null;
  }
  if (parts[1] === "need" && parts.length === 3) return { kind: "need", needId: parts[2] };
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
      description: `Giftly cash donation to ${charity.name}`,
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
    description: `Giftly gift: ${need.title} for ${need.charity.name}`,
  };
}
