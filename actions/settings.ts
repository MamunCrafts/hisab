"use server";

import { and, eq, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { profiles, sessions, users } from "@/db/schema";
import { audit } from "@/db/mutations/audit";
import { UserFacingError } from "@/lib/action-result";
import { auth } from "@/lib/auth/auth";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { authedAction } from "@/lib/safe-action";
import { deleteAttachmentFile, storeAttachment, validateAttachment } from "@/lib/storage";
import { preferencesSchema, profileSchema } from "@/lib/validation/settings";

export async function updateProfileAction(input: unknown) {
  const result = await authedAction(profileSchema, input, async ({ userId, input }) => {
    await db.transaction(async (tx) => {
      await tx.update(profiles).set({ displayName: input.displayName }).where(eq(profiles.userId, userId));
      await tx.update(users).set({ name: input.displayName, updatedAt: new Date() }).where(eq(users.id, userId));
    });
    return null;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

const AVATAR_MAX = 2 * 1024 * 1024;

/** Avatar images are stored privately and served only to their owner via /api/avatar. */
export async function updateAvatarAction(formData: FormData) {
  const result = await authedAction(z.instanceof(FormData), formData, async ({ userId, input }) => {
    const file = input.get("avatar");
    const remove = input.get("remove") === "1";
    const [profile] = await db.select({ avatarUrl: profiles.avatarUrl }).from(profiles).where(eq(profiles.userId, userId));
    const previousKey = profile?.avatarUrl?.startsWith("key:") ? profile.avatarUrl.slice(4) : null;
    if (remove) {
      await db.update(profiles).set({ avatarUrl: null }).where(eq(profiles.userId, userId));
    } else {
      if (!(file instanceof File) || file.size === 0) throw new UserFacingError("validation.required", "avatar");
      if (file.size > AVATAR_MAX) throw new UserFacingError("validation.fileSize", "avatar");
      const checked = await validateAttachment(file);
      if (!checked.ok || checked.file.contentType === "application/pdf") throw new UserFacingError("validation.fileType", "avatar");
      const key = await storeAttachment(userId, checked.file);
      await db.update(profiles).set({ avatarUrl: `key:${key}` }).where(eq(profiles.userId, userId));
    }
    if (previousKey) await deleteAttachmentFile(previousKey);
    return null;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function updatePreferencesAction(input: unknown) {
  const result = await authedAction(preferencesSchema, input, async ({ userId, input }) => {
    await db.update(profiles).set(input).where(eq(profiles.userId, userId));
    (await cookies()).set(LOCALE_COOKIE, input.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return null;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Sign out one of the user's other sessions (by id — tokens never reach the browser). */
export async function revokeSessionAction(sessionId: string) {
  return authedAction(z.string().min(1).max(200), sessionId, async ({ userId, input }) => {
    const current = await auth.api.getSession({ headers: await headers() });
    if (current?.session.id === input) throw new UserFacingError("errors.generic");
    await db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.id, input)));
    await audit(db, { userId, action: "session.revoke", entityType: "session", entityId: input });
    return null;
  });
}

export async function revokeOtherSessionsAction() {
  return authedAction(z.undefined(), undefined, async ({ userId }) => {
    const current = await auth.api.getSession({ headers: await headers() });
    if (!current) throw new UserFacingError("errors.unauthorized");
    await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, current.session.id)));
    await audit(db, { userId, action: "session.revoke_others", entityType: "session" });
    return null;
  });
}
