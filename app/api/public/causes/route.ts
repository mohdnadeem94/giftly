import { NextResponse } from "next/server";
import { listCauses } from "@/lib/public-data";

export const dynamic = "force-dynamic";

// Public list of causes with totals. Safe fields only.
export async function GET() {
  try {
    return NextResponse.json(await listCauses());
  } catch (err) {
    console.error("public causes failed", err);
    return NextResponse.json({ error: "Could not load causes" }, { status: 500 });
  }
}
