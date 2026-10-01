import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { GH_TAG } from "@/lib/github";

/**
 * GitHub -> Settings -> Webhooks: payload URL https://<your-site>/api/revalidate, content type application/json,
 * secret = GITHUB_WEBHOOK_SECRET, events "Pushes" (and "Releases" on a releases repo). Every push then refreshes the site instantly.
 */
export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "GITHUB_WEBHOOK_SECRET is not set" }, { status: 501 });

  const body = await req.text();
  const given = Buffer.from(req.headers.get("x-hub-signature-256") ?? "");
  const want = Buffer.from("sha256=" + createHmac("sha256", secret).update(body).digest("hex"));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  const event = req.headers.get("x-github-event");
  if (event === "ping") return NextResponse.json({ ok: true, pong: true });
  if (event === "push" || event === "release" || event === "create") {
    revalidateTag(GH_TAG, { expire: 0 });
    return NextResponse.json({ revalidated: true, event });
  }
  return NextResponse.json({ ignored: event });
}
