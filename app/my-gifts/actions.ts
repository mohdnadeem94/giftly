"use server";

import { cookies } from "next/headers";
import { ItemStatus, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { DONOR_COOKIE } from "@/lib/donor-data";
import { getDemoSession } from "@/lib/session";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 90,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Demo convenience: view the tracker as a seeded (fictional) donor who has delivered gifts.
 * Only available in the Donor demo role. Seeded donors are fake demo data.
 */
export async function viewAsDemoDonor(): Promise<{ ok: boolean; error?: string }> {
  const { role } = await getDemoSession();
  if (role !== "donor") return { ok: false, error: "Switch to the Donor role first." };

  const candidates = await db.donor.findMany({
    where: {
      email: { startsWith: "donor", endsWith: "@example.com" }, // seeded demo donors only (donorN@example.com)
      orders: { some: { status: OrderStatus.PAID, items: { some: { status: ItemStatus.DELIVERED } } } },
    },
    select: { id: true, _count: { select: { orders: true } } },
  });
  const pick = candidates.sort((a, b) => b._count.orders - a._count.orders)[0];
  if (!pick) return { ok: false, error: "No demo donor found. Reset the demo data first." };

  (await cookies()).set(DONOR_COOKIE, pick.id, cookieOpts);
  return { ok: true };
}

/** Forget the donor on this browser. */
export async function forgetDonor(): Promise<{ ok: boolean }> {
  (await cookies()).delete(DONOR_COOKIE);
  return { ok: true };
}
