import type { Locale } from "./config";
import { en, type Dictionary } from "@/locales/en";
import { bn } from "@/locales/bn";

export const dictionaries: Record<Locale, Dictionary> = { en, bn };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
