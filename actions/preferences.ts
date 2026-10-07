"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { authedAction } from "@/lib/safe-action";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function writeLocaleCookie(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/** Switch language. Works signed-out (cookie only) and signed-in (also saved to profile). */
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return { ok: false as const };
  await writeLocaleCookie(locale);
  const user = await getCurrentUser();
  if (user) {
    await db.update(profiles).set({ locale }).where(eq(profiles.userId, user.id));
  }
  return { ok: true as const };
}

/** After sign-in, align the language cookie and theme with the saved profile. */
export async function syncPreferencesAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  const [profile] = await db
    .select({ locale: profiles.locale, theme: profiles.theme })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);
  if (profile && isLocale(profile.locale)) await writeLocaleCookie(profile.locale);
  return { ok: true as const, theme: profile?.theme ?? "system" };
}

export async function setThemeAction(theme: string) {
  return authedAction(z.enum(["light", "dark", "system"]), theme, async ({ userId, input }) => {
    await db.update(profiles).set({ theme: input }).where(eq(profiles.userId, userId));
    return null;
  });
}
