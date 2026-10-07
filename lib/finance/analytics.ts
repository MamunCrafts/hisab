import { addMoney, percentOf, type MoneyString } from "@/lib/money";

export type Slice = { key: string; label: string; total: MoneyString; percent: number; colorVar: string; categoryId: string | null };

const MAX_SEGMENTS = 6;

/**
 * Top categories plus an "Other" bucket so a donut never shows more than
 * MAX_SEGMENTS slices. Colors follow slot order (fixed, never cycled).
 */
export function foldSlices(
  items: Array<{ key: string; label: string; total: MoneyString; categoryId: string | null }>,
  otherLabel: string,
): Slice[] {
  const sum = addMoney(...items.map((i) => i.total));
  const keep = items.length > MAX_SEGMENTS ? items.slice(0, MAX_SEGMENTS - 1) : items;
  const rest = items.length > MAX_SEGMENTS ? items.slice(MAX_SEGMENTS - 1) : [];
  const slices: Slice[] = keep.map((item, index) => ({
    ...item,
    percent: percentOf(item.total, sum) ?? 0,
    colorVar: `var(--chart-${index + 1})`,
  }));
  if (rest.length > 0) {
    const total = addMoney(...rest.map((r) => r.total));
    slices.push({ key: "__other", label: otherLabel, total, percent: percentOf(total, sum) ?? 0, colorVar: "var(--chart-7)", categoryId: null });
  }
  return slices;
}
