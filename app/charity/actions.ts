"use server";

import { AdminDecision, ItemStatus, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getActingCharity, giftRowSelect, toGiftRow, type CharityGiftRow } from "@/lib/charity-data";
import { GIFT_FLOW, isAllowedTransition, type GiftFlowStatus } from "@/lib/gift-status";
import { proofAllowsDelivery } from "@/lib/proof-check";

type Result = { ok: true; rows: CharityGiftRow[]; skipped: number } | { ok: false; error: string };

/**
 * Move gifts one step forward (PAID -> BOUGHT -> DELIVERED).
 * Enforced here on the server whatever the browser sends:
 *  - only the Charity/Admin demo roles,
 *  - only gifts that belong to the acting charity and were actually paid,
 *  - only the next step in the flow,
 *  - DELIVERED only with a matching (or admin-approved) receipt.
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
    select: {
      id: true,
      status: true,
      proofs: { orderBy: { createdAt: "desc" }, take: 1, select: { aiResult: true, adminDecision: true } },
    },
  });

  let allowed = items.filter((i) => isAllowedTransition(i.status, to));
  if (to === "DELIVERED") {
    const withProof = allowed.filter((i) => proofAllowsDelivery(i.proofs[0]));
    if (withProof.length === 0 && allowed.length > 0) {
      return {
        ok: false,
        error: "Upload a receipt first. A gift can be marked Delivered once the receipt matches, or an admin approves it.",
      };
    }
    allowed = withProof;
  }
  const allowedIds = allowed.map((i) => i.id);
  const skipped = ids.length - allowedIds.length;
  if (allowedIds.length === 0) {
    return {
      ok: false,
      error: to === "BOUGHT" ? "Only gifts marked Paid can be marked Bought." : "Only gifts marked Bought can be marked Delivered.",
    };
  }

  // Re-check the current status inside the update so two quick clicks can't skip a step.
  await db.orderItem.updateMany({
    where: { id: { in: allowedIds }, status: to === "BOUGHT" ? ItemStatus.PAID : ItemStatus.BOUGHT },
    data: { status: to as ItemStatus },
  });

  const rows = await db.orderItem.findMany({ where: { id: { in: allowedIds } }, select: giftRowSelect });
  return { ok: true, rows: rows.map(toGiftRow), skipped };
}

/** Admin only: approve or reject the latest receipt for a gift (used when the AI says mismatch/unclear). */
export async function reviewProof(itemId: string, decision: "APPROVED" | "REJECTED"): Promise<Result> {
  const charity = await getActingCharity();
  if (!charity || charity.role !== "admin") return { ok: false, error: "Only the Admin role can approve or reject receipts." };
  if (decision !== "APPROVED" && decision !== "REJECTED") return { ok: false, error: "Invalid decision." };

  const proof = await db.proof.findFirst({
    where: { orderItemId: String(itemId), orderItem: { order: { charityId: charity.id, status: OrderStatus.PAID } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!proof) return { ok: false, error: "No receipt to review for this gift." };

  await db.proof.update({ where: { id: proof.id }, data: { adminDecision: decision as AdminDecision } });
  const row = await db.orderItem.findUnique({ where: { id: String(itemId) }, select: giftRowSelect });
  return { ok: true, rows: row ? [toGiftRow(row)] : [], skipped: 0 };
}
