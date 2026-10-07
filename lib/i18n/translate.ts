import type { Dictionary } from "@/locales/en";

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;

/** Dot-separated paths to every string leaf of the dictionary. */
export type TranslationKey<T = Dictionary> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, TranslationKey<T[K]>>;
}[keyof T & string];

export type TranslationParams = Record<string, string | number>;
export type Translator = (key: TranslationKey, params?: TranslationParams) => string;

export function createTranslator(dictionary: Dictionary): Translator {
  return (key, params) => {
    let node: unknown = dictionary;
    for (const part of key.split(".")) {
      node = (node as Record<string, unknown> | undefined)?.[part];
    }
    if (typeof node !== "string") return key;
    if (!params) return node;
    return node.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}
