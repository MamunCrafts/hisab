"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { accounts, profiles } from "@/db/schema";
import { STARTER_ACCOUNTS, type StarterAccountKey } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";
import { authedAction } from "@/lib/safe-action";
import { onboardingSchema } from "@/lib/validation/onboarding";

/** Creates the selected starter accounts and marks onboarding complete. */
export async function completeOnboardingAction(input: unknown) {
  const { t } = await getI18n();
  return authedAction(onboardingSchema, input, async ({ userId, input }) => {
    await db.transaction(async (tx) => {
      const [profile] = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(and(eq(profiles.userId, userId), isNull(profiles.onboardingCompletedAt)))
        .for("update");
      if (!profile) return; // Already completed (e.g. double submit).

      const existing = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId)).limit(1);
      // Skipping still gives the user a Cash account so quick add works immediately.
      const selected = input.accounts.length > 0 || existing.length > 0 ? input.accounts : [{ key: "cash", openingBalance: "0.00" }];

      if (selected.length > 0) {
        const rows = selected.map((item, index) => {
          const starter = STARTER_ACCOUNTS.find((a) => a.key === item.key)!;
          return {
            userId,
            name: t(`starterAccounts.${starter.key as StarterAccountKey}`),
            type: starter.type,
            icon: starter.icon,
            openingBalance: item.openingBalance,
            sortOrder: index,
          };
        });
        const created = await tx.insert(accounts).values(rows).returning({ id: accounts.id });
        await tx
          .update(profiles)
          .set({ lastUsedAccountId: created[0]?.id ?? null })
          .where(eq(profiles.userId, userId));
      }

      await tx.update(profiles).set({ onboardingCompletedAt: new Date() }).where(eq(profiles.userId, userId));
    });
    revalidatePath("/", "layout");
    return null;
  });
}
