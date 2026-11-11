import { NextResponse } from "next/server";
import { HOLD_HOURS, releaseExpiredHolds } from "@/lib/holds";

export const dynamic = "force-dynamic";

// POST /api/cron/release-holds  (header: Authorization: Bearer <CRON_SECRET>)
// Releases (voids) every gift payment hold older than 72 hours, so the donor is never charged.
// Call it from a Render Cron Job every 15 minutes. Pages that list gifts also run this check.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const released = await releaseExpiredHolds(100);
    return NextResponse.json({ ok: true, released, holdHours: HOLD_HOURS });
  } catch (err) {
    console.error("release-holds cron failed");
    return NextResponse.json({ error: "Could not release holds" }, { status: 500 });
  }
}
