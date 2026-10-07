import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { readAttachment } from "@/lib/storage";

export const runtime = "nodejs";

/** The signed-in user's own avatar image. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const [profile] = await db.select({ avatarUrl: profiles.avatarUrl }).from(profiles).where(eq(profiles.userId, user.id));
  const key = profile?.avatarUrl?.startsWith("key:") ? profile.avatarUrl.slice(4) : null;
  if (!key || !key.startsWith(`users/${user.id}/`)) return new Response("Not found", { status: 404 });
  const file = await readAttachment(key);
  if (!file) return new Response("Not found", { status: 404 });
  const ext = key.split(".").pop();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return new Response(file.body as BodyInit, {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
