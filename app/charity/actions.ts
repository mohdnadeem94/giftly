"use server";

import { ItemStatus, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getActingCharity, giftRowSelect, toGiftRow, type CharityGiftRow } from "@/lib/charity-data";
import { GIFT_FLOW, isAllowedTransition, type GiftFlowStatus } from "@/lib/gift-status";

type Result = { ok: true; rows: CharityGiftRow[]; skipped: number } | { ok: false; error: string };

/**
 * Move gifts one step forward (PAID -> BOUGHT -> DELIVERED).
 * Enforced here on the server whatever the browser sends:
 *  - only the Charity/Admin demo roles,
 *  - only gifts that belong to the acting charity and were actually paid,
 *  - only the next step in the flow.
 */
export async function updateGiftStatus(itemIds: string[], to: string): Promise<Result> {
  const charity = await getActingCharity();
  if (!charity) return { ok: false, error: "Switch to the Charity role to update gifts." };

  if (!GIFT_FLOW.includes(to as GiftFlowStatus) || to === "PAID") {
    return { ok: false, error: "That status change isn't allowed." };
  }
  const ids = Array.isArray(itemIds) ? itemIds.filter((id) => typeof id === "string").slice(0, 200) : [];
  if (ids.length === 0) return { ok: false, error: "No gifts selected." };

  const items = await db.orderItem.findMany({
    where: { id: { in: ids }, order: { charityId: charity.id, status: OrderStatus.PAID } },
    select: { id: true, status: true },
  });

  const allowed = items.filter((i) => isAllowedTransition(i.status, to)).map((i) => i.id);
  const skipped = ids.length - allowed.length;
  if (allowed.length === 0) {
    return {
      ok: false,
      error:
        to === "BOUGHT"
          ? "Only gifts marked Paid can be marked Bought."
          : "Only gifts marked Bought can be marked Delivered.",
    };
  }

  // Re-check the current status inside the update so two quick clicks can't skip a step.
  await db.orderItem.updateMany({
    where: { id: { in: allowed }, status: to === "BOUGHT" ? ItemStatus.PAID : ItemStatus.BOUGHT },
    data: { status: to as ItemStatus },
  });

  const rows = await db.orderItem.findMany({ where: { id: { in: allowed } }, select: giftRowSelect });
  return { ok: true, rows: rows.map(toGiftRow), skipped };
}
