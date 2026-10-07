import type { DbExecutor } from "@/db/client";
import { auditLogs } from "@/db/schema";

/** Records destructive actions. Metadata must not include amounts or notes. */
export async function audit(
  executor: DbExecutor,
  entry: { userId: string; action: string; entityType: string; entityId?: string | null; metadata?: Record<string, unknown> },
) {
  await executor.insert(auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
  });
}
