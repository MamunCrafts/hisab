import { CATEGORY_STYLE, EXPENSE_CATEGORY_KEYS, INCOME_CATEGORY_KEYS } from "@/lib/constants";
import type { DbExecutor } from "@/db/client";
import { categories, profiles } from "@/db/schema";

/**
 * Creates the profile and starter categories for a new user. Idempotent, so it
 * is safe to call again (e.g. from onboarding) if signup was interrupted.
 */
export async function createStarterData(
  executor: DbExecutor,
  user: { id: string; name: string },
  locale = "en",
) {
  await executor.transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values({ userId: user.id, displayName: user.name, locale })
      .onConflictDoNothing({ target: profiles.userId });

    const rows = [
      ...EXPENSE_CATEGORY_KEYS.map((key, index) => ({ key, kind: "EXPENSE" as const, index })),
      ...INCOME_CATEGORY_KEYS.map((key, index) => ({ key, kind: "INCOME" as const, index })),
    ].map(({ key, kind, index }) => ({
      userId: user.id,
      kind,
      systemKey: key,
      icon: CATEGORY_STYLE[key].icon,
      color: CATEGORY_STYLE[key].color,
      sortOrder: index,
    }));

    await tx.insert(categories).values(rows).onConflictDoNothing();
  });
}
