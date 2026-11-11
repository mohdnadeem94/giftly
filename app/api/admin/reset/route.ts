import { NextResponse } from "next/server";
import { passcodeMatches, resetDemoData } from "@/lib/demo-reset";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/admin/reset  — releases outstanding PayPal holds, then wipes and reseeds the demo data.
// Protected by the ADMIN_PASSCODE env variable, sent in the "x-admin-passcode" header.
export async function POST(req: Request) {
  if (!process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ error: "ADMIN_PASSCODE is not configured" }, { status: 503 });
  }
  if (!passcodeMatches(req.headers.get("x-admin-passcode"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const res = await resetDemoData();
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true, ...res.summary });
  } catch {
    console.error("resetDemoData failed");
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
