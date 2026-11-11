import { NextResponse } from "next/server";
import { ItemStatus, OrderStatus, PaymentState, ProofResult } from "@prisma/client";
import { db } from "@/lib/db";
import { getActingCharity, giftRowSelect, toGiftRow } from "@/lib/charity-data";
import { checkReceipt } from "@/lib/proof-check";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 2 * 1024 * 1024; // ~2 MB

/** Detect the real image type from the file's first bytes (don't trust the browser's label). */
function sniffImageType(b: Uint8Array): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

// POST /api/proofs  (multipart form: itemId, file)
// Charity uploads a receipt for a gift marked Bought. The AI checks it right away.
export async function POST(req: Request) {
  const charity = await getActingCharity();
  if (!charity) return NextResponse.json({ error: "Switch to the Charity role to upload receipts." }, { status: 403 });

  let form: FormData;
  try {
    const limit = MAX_BYTES + 64 * 1024; // Allow bounded multipart headers in addition to the image.
    if (Number(req.headers.get("content-length")) > limit) return NextResponse.json({ error: "Upload too large." }, { status: 413 });
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return NextResponse.json({ error: "Upload too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    form = await new Response(Buffer.concat(chunks) as unknown as BodyInit, {
      headers: { "content-type": req.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const itemId = String(form.get("itemId") ?? "");
  const file = form.get("file");
  if (!itemId || !(file instanceof File)) return NextResponse.json({ error: "Choose a receipt image to upload." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Please upload an image under 2 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image of the receipt." }, { status: 415 });

  const item = await db.orderItem.findFirst({
    where: { id: itemId, order: { charityId: charity.id, status: OrderStatus.PAID, paymentState: PaymentState.CAPTURED } },
    select: { id: true, status: true, productTitle: true, merchant: true, priceAtPaymentCents: true, priceAtRecommendationCents: true },
  });
  if (!item) return NextResponse.json({ error: "Gift not found for this charity." }, { status: 404 });
  if (item.status !== ItemStatus.BOUGHT) {
    return NextResponse.json({ error: "Mark the gift as Bought before uploading its receipt." }, { status: 409 });
  }

  const verdict = await checkReceipt({
    imageBase64: Buffer.from(bytes).toString("base64"),
    mimeType,
    expected: {
      title: item.productTitle,
      priceCents: item.priceAtPaymentCents ?? item.priceAtRecommendationCents,
      merchant: item.merchant,
    },
  });

  await db.proof.create({
    data: {
      orderItemId: item.id,
      imageData: Buffer.from(bytes),
      mimeType,
      aiResult: verdict.result as ProofResult,
      aiNotes: verdict.notes,
    },
  });

  const row = await db.orderItem.findUnique({ where: { id: item.id }, select: giftRowSelect });
  return NextResponse.json({ ok: true, verdict, row: row ? toGiftRow(row) : null });
}
