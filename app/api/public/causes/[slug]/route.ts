import { NextResponse } from "next/server";
import { getCause } from "@/lib/public-data";

export const dynamic = "force-dynamic";

// Public detail for one cause: story, needs, gift status counts, donations feed. Safe fields only.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    const cause = await getCause(slug);
    if (!cause) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(cause);
  } catch (err) {
    console.error("public cause failed", err);
    return NextResponse.json({ error: "Could not load cause" }, { status: 500 });
  }
}
