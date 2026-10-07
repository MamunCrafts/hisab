import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { attachments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { readAttachment } from "@/lib/storage";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Streams a private receipt to its owner only. */
export async function GET(request: Request, { params }: RouteContext<"/api/attachments/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const [attachment] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, user.id)))
    .limit(1);
  if (!attachment) return new Response("Not found", { status: 404 });

  const file = await readAttachment(attachment.storageKey);
  if (!file) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = encodeURIComponent(attachment.originalName);
  const headers = new Headers({
    "Content-Type": attachment.contentType,
    "Content-Length": String(attachment.size),
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  // Images get a locked-down CSP; PDFs need the browser's built-in viewer.
  if (attachment.contentType.startsWith("image/")) {
    headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  }
  return new Response(file.body as BodyInit, { headers });
}
