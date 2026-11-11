// Who is looking at a page (server only): decides the public, donor or charity view of causes.
// Demo roles only; every action is still validated on the server.
import { OrderStatus, PaymentState } from "@prisma/client";
import { db } from "@/lib/db";
import { getDemoSession } from "@/lib/session";
import { getCurrentDonor } from "@/lib/donor-data";
import type { Role } from "@/lib/roles";

export type Viewer = {
  role: Role;
  mode: "public" | "donor" | "charity"; // admin sees the donor view (and can give)
  donorName: string | null;
  donorId: string | null; // set after this browser has made a verified payment
  ownCharity: { id: string; slug: string; name: string } | null; // only in the charity view
};

export async function getViewer(): Promise<Viewer> {
  const { role, charitySlug, donorName } = await getDemoSession();
  if (role === "charity") {
    const ownCharity =
      (charitySlug && (await db.charity.findUnique({ where: { slug: charitySlug }, select: { id: true, slug: true, name: true } }))) ||
      (await db.charity.findFirst({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }));
    return { role, mode: "charity", donorName: null, donorId: null, ownCharity };
  }
  if (role === "donor" || role === "admin") {
    const donor = await getCurrentDonor().catch(() => null);
    return { role, mode: "donor", donorName: donorName ?? donor?.displayName ?? null, donorId: donor?.id ?? null, ownCharity: null };
  }
  return { role, mode: "public", donorName: null, donorId: null, ownCharity: null };
}

/** How much this donor gave to each cause (charged or currently on hold), keyed by cause slug. */
export async function getDonorGivingBySlug(donorId: string): Promise<Record<string, number>> {
  const orders = await db.order.findMany({
    where: {
      donorId,
      status: { in: [OrderStatus.RECEIVED, OrderStatus.PAID] },
      paymentState: { in: [PaymentState.CAPTURED, PaymentState.AUTHORIZED] },
    },
    select: { totalCents: true, charity: { select: { slug: true } } },
  });
  const out: Record<string, number> = {};
  for (const o of orders) out[o.charity.slug] = (out[o.charity.slug] ?? 0) + o.totalCents;
  return out;
}
