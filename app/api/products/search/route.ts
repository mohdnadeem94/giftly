import { NextResponse } from "next/server";
import { Channel3Error, searchGiftProducts } from "@/lib/channel3";

export const dynamic = "force-dynamic";

// GET /api/products/search?q=storybook+for+a+5+year+old&max=20&limit=6
// q: 2-120 chars. max: optional budget in USD (1-500). limit: 1-12.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").replace(/\s+/g, " ").trim();
  const maxDollars = Number(url.searchParams.get("max"));
  const limit = Number(url.searchParams.get("limit") ?? 6);

  if (q.length < 2 || q.length > 120) {
    return NextResponse.json({ error: "Please describe the gift in 2 to 120 characters." }, { status: 400 });
  }
  const maxCents =
    Number.isFinite(maxDollars) && maxDollars >= 1 && maxDollars <= 500 ? Math.round(maxDollars * 100) : undefined;

  try {
    const products = await searchGiftProducts({
      query: q,
      maxCents,
      limit: Number.isFinite(limit) ? limit : 6,
    });
    return NextResponse.json({ products });
  } catch (err) {
    if (err instanceof Channel3Error && err.status === 503) {
      return NextResponse.json({ error: "Product search isn't configured yet." }, { status: 503 });
    }
    if (err instanceof Channel3Error && err.status === 429) {
      return NextResponse.json({ error: "Product search is busy. Please try again in a moment." }, { status: 429 });
    }
    console.error("product search failed", err);
    return NextResponse.json({ error: "Product search failed. Please try again." }, { status: 502 });
  }
}
