import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceDb } from "../../../../lib/server";
import { syncDeployment } from "../../../../lib/publishing";
export async function POST(request: Request) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) return new NextResponse(null, { status: 503 });
  const raw = await request.text();
  if (raw.length > 256000) return new NextResponse(null, { status: 413 });
  const signature = request.headers.get("x-vercel-signature") || "";
  const expected = createHmac("sha1", secret).update(raw).digest("hex");
  if (
    !/^[a-f0-9]{40}$/.test(signature) ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return new NextResponse(null, { status: 401 });
  try {
    const event = JSON.parse(raw);
    const id = event.payload?.deployment?.id;
    if (typeof id !== "string") return NextResponse.json({ received: true });
    const { data } = await serviceDb()
      .from("deployments")
      .select("id,site_id")
      .eq("vercel_id", id)
      .maybeSingle();
    if (data) await syncDeployment(data.id, data.site_id);
    return NextResponse.json({ received: true });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
