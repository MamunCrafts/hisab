"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { listNotifications } from "@/db/queries/notifications";
import { authedAction } from "@/lib/safe-action";

export async function listNotificationsAction() {
  return authedAction(z.undefined(), undefined, ({ userId }) => listNotifications(userId));
}

export async function markNotificationReadAction(id: string) {
  return authedAction(z.string().uuid(), id, async ({ userId, input }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.id, input), isNull(notifications.readAt)));
    return null;
  });
}

export async function markAllNotificationsReadAction() {
  return authedAction(z.undefined(), undefined, async ({ userId }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return null;
  });
}
