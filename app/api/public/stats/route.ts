import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/public-data";

export const dynamic = "force-dynamic";

// Public totals only. No individual donor records.
export async function GET() {
  try {
    return NextResponse.json(await getPublicStats());
  } catch (err) {
    console.error("public stats failed", err);
    return NextResponse.json({ error: "Could not load stats" }, { status: 500 });
  }
}
