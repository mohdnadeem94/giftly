import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetAndSeed } from "@/lib/seed";
import { releaseHold } from "@/lib/holds";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/admin/reset  — wipes and reseeds the demo data.
// Protected by the ADMIN_PASSCODE env variable, sent in the "x-admin-passcode" header.
export async function POST(req: Request) {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) {
    return NextResponse.json({ error: "ADMIN_PASSCODE is not configured" }, { status: 503 });
  }
  if (req.headers.get("x-admin-passcode") !== passcode) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Release (void) every outstanding PayPal hold first, so no sandbox donor is left with a hold
    // that the wiped database no longer knows about.
    const held = await db.order.findMany({ where: { paymentState: "AUTHORIZED" }, select: { id: true } });
    let stillHeld = 0;
    for (const o of held) if (!(await releaseHold(o.id, "CHARITY_RELEASED"))) stillHeld++;
    if (stillHeld) {
      return NextResponse.json({ error: `PayPal couldn't release ${stillHeld} payment hold(s). Try the reset again in a moment.` }, { status: 409 });
    }
    const result = await resetAndSeed(db);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("resetDemoData failed");
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
