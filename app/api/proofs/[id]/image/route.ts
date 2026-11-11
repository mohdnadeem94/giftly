import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActingCharity } from "@/lib/charity-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/proofs/:id/image — receipt image, only for the charity that owns the gift (or Admin acting as it).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const charity = await getActingCharity();
  if (!charity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const proof = await db.proof.findFirst({
    where: { id, orderItem: { order: { charityId: charity.id } } },
    select: { imageData: true, mimeType: true },
  });
  if (!proof) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(Buffer.from(proof.imageData) as unknown as BodyInit, {
    headers: {
      "content-type": proof.mimeType,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
