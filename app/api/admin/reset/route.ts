import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetAndSeed } from "@/lib/seed";

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
    const result = await resetAndSeed(db);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("resetDemoData failed", err);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
