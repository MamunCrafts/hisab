import type { Translator, TranslationKey } from "@/lib/i18n/translate";

export type CategoryLike = { name: string | null; systemKey: string | null };

/** Display name: custom name if renamed, otherwise the translated starter name. */
export function categoryLabel(category: CategoryLike | null | undefined, t: Translator): string {
  if (!category) return t("categories.uncategorized");
  if (category.name) return category.name;
  if (category.systemKey) return t(`categories.${category.systemKey}` as TranslationKey);
  return t("categories.uncategorized");
}
