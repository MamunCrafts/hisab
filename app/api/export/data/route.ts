import { buildBackup } from "@/db/queries/backup";
import { audit } from "@/db/mutations/audit";
import { db } from "@/db/client";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const backup = await buildBackup(user.id);
  await audit(db, { userId: user.id, action: "data.export", entityType: "user", entityId: user.id });
  const date = backup.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hisab-backup-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
