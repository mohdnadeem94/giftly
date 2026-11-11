// Wipe and reseed the demo data (server only). Used by the admin console and POST /api/admin/reset.
// Releases (voids) every outstanding PayPal hold first, so no sandbox donor keeps a hold the
// wiped database no longer knows about.
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { resetAndSeed } from "@/lib/seed";
import { releaseHold } from "@/lib/holds";

/** Constant-time passcode check against ADMIN_PASSCODE. False if it isn't configured. */
export function passcodeMatches(given: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function resetDemoData(): Promise<{ ok: true; summary: Awaited<ReturnType<typeof resetAndSeed>> } | { ok: false; status: number; error: string }> {
  const held = await db.order.findMany({ where: { paymentState: "AUTHORIZED" }, select: { id: true } });
  let stillHeld = 0;
  for (const o of held) if (!(await releaseHold(o.id, "ADMIN_RELEASED"))) stillHeld++;
  if (stillHeld) {
    return { ok: false, status: 409, error: `PayPal couldn't release ${stillHeld} payment hold(s). Nothing was deleted; try again in a moment.` };
  }
  const summary = await resetAndSeed(db);
  return { ok: true, summary };
}
