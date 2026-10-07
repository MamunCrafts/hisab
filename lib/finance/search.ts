import { dictionaries } from "@/lib/i18n/dictionaries";

/** Starter-category keys whose name (in any language) contains the query. */
export function matchingCategoryKeys(query: string | null): string[] {
  if (!query) return [];
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const keys = new Set<string>();
  for (const dictionary of Object.values(dictionaries)) {
    for (const [key, label] of Object.entries(dictionary.categories)) {
      if (label.toLowerCase().includes(needle)) keys.add(key);
    }
  }
  return [...keys];
}
