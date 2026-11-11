import { NextResponse } from "next/server";
import { getChartData } from "@/lib/chart-data";
import { getChartCaption } from "@/lib/chart-caption";
import { llmConfigured } from "@/lib/llm";

export const dynamic = "force-dynamic";

// GET /api/public/charts?cause=<slug>&caption=1
// Public aggregates for charts (totals only). With caption=1, also a one-line AI summary of these numbers.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cause = url.searchParams.get("cause");
  if (cause && !/^[a-z0-9-]{1,60}$/.test(cause)) return NextResponse.json({ error: "Invalid cause" }, { status: 400 });

  try {
    const data = await getChartData(cause);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (url.searchParams.get("caption") === "1") {
      const caption = llmConfigured() ? await getChartCaption(data) : null;
      return NextResponse.json({ caption });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("public charts failed", err);
    return NextResponse.json({ error: "Could not load charts" }, { status: 500 });
  }
}
