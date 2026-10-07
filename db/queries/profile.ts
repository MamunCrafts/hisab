import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { createStarterData } from "./starter";

export type Profile = typeof profiles.$inferSelect;

/** One profile read per request, shared by the layout and every page/query helper. */
const loadProfile = cache(async (userId: string): Promise<Profile | null> => {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ?? null;
});

/** Profile for the given (already authenticated) user, creating it if missing. */
export const getProfile = cache(async (userId: string, fallbackName: string): Promise<Profile> => {
  const row = await loadProfile(userId);
  if (row) return row;
  await createStarterData(db, { id: userId, name: fallbackName });
  const [created] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return created;
});

export type UserSettings = {
  timezone: string;
  weekStartsOn: number;
  currency: string;
  lastUsedAccountId: string | null;
  displayName: string;
};

/** Calendar/currency settings used by queries. Falls back to Bangladesh defaults. */
export const getUserSettings = cache(async (userId: string): Promise<UserSettings> => {
  const row = await loadProfile(userId);
  return row
    ? {
        timezone: row.timezone,
        weekStartsOn: row.startOfWeek,
        currency: row.preferredCurrency,
        lastUsedAccountId: row.lastUsedAccountId,
        displayName: row.displayName,
      }
    : { timezone: "Asia/Dhaka", weekStartsOn: 6, currency: "BDT", lastUsedAccountId: null, displayName: "" };
});
