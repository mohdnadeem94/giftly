"use server";

// Admin console actions. Every action re-checks the Admin demo role on the server.
import { cookies } from "next/headers";
import { AdminDecision, ItemStatus, PaymentState } from "@prisma/client";
import { db } from "@/lib/db";
import { getDemoSession } from "@/lib/session";
import { CHARITY_COOKIE } from "@/lib/roles";
import { releaseHold } from "@/lib/holds";
import { passcodeMatches, resetDemoData } from "@/lib/demo-reset";

type Res = { ok: true; message?: string } | { ok: false; error: string };

async function isAdmin() {
  return (await getDemoSession()).role === "admin";
}

/** Approve or reject a disputed receipt (AI said mismatch or unclear). Approve lets the charity mark it Delivered. */
export async function adminReviewReceipt(proofId: string, decision: "APPROVED" | "REJECTED"): Promise<Res> {
  if (!(await isAdmin())) return { ok: false, error: "Only the Admin role can review receipts." };
  if (decision !== "APPROVED" && decision !== "REJECTED") return { ok: false, error: "Invalid decision." };
  const updated = await db.proof.updateMany({
    where: { id: String(proofId), adminDecision: null, orderItem: { status: ItemStatus.BOUGHT } },
    data: { adminDecision: decision as AdminDecision },
  });
  if (!updated.count) return { ok: false, error: "This receipt was already reviewed or the gift moved on." };
  return { ok: true, message: decision === "APPROVED" ? "Receipt approved. The charity can now mark it Delivered." : "Receipt rejected. The charity needs to upload a correct one." };
}

/** Release any held gift payment (stuck or disputed). The donor is never charged. */
export async function adminReleaseHold(orderId: string): Promise<Res> {
  if (!(await isAdmin())) return { ok: false, error: "Only the Admin role can release holds." };
  const order = await db.order.findFirst({ where: { id: String(orderId), paymentState: PaymentState.AUTHORIZED }, select: { id: true } });
  if (!order) return { ok: false, error: "This payment is no longer on hold." };
  const done = await releaseHold(order.id, "ADMIN_RELEASED");
  return done ? { ok: true, message: "Hold released. The donor won't be charged." } : { ok: false, error: "PayPal couldn't release the hold right now. Try again." };
}

/** Open a charity's dashboard as Admin (sets which charity the dashboard shows). */
export async function adminOpenCharity(slug: string): Promise<Res> {
  if (!(await isAdmin())) return { ok: false, error: "Only the Admin role can do that." };
  const charity = await db.charity.findUnique({ where: { slug: String(slug) }, select: { slug: true } });
  if (!charity) return { ok: false, error: "Charity not found." };
  (await cookies()).set(CHARITY_COOKIE, charity.slug, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return { ok: true };
}

/** Reset the demo data. Needs the ADMIN_PASSCODE as well as the Admin role. */
export async function adminResetDemo(passcode: string): Promise<Res> {
  if (!(await isAdmin())) return { ok: false, error: "Only the Admin role can reset demo data." };
  if (!process.env.ADMIN_PASSCODE) return { ok: false, error: "ADMIN_PASSCODE is not configured on the server." };
  if (!passcodeMatches(passcode)) return { ok: false, error: "Wrong passcode." };
  try {
    const res = await resetDemoData();
    return res.ok ? { ok: true, message: "Demo data reset. Holds were released first." } : { ok: false, error: res.error };
  } catch {
    console.error("admin reset failed");
    return { ok: false, error: "Reset failed. Check the server log." };
  }
}
