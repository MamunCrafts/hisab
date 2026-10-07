/**
 * Decimal-safe money helpers.
 *
 * Money values travel through the app as strings with up to 2 decimals (the
 * representation of NUMERIC(18,2)). Arithmetic is done on integer paisa using
 * BigInt so we never rely on floating-point.
 */

export type MoneyString = string;

const MONEY_PATTERN = /^([+-])?(\d+)(?:\.(\d{1,2})\d*)?$/;

const BANGLA_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/** Convert a money string (or bigint paisa) to integer paisa. */
export function toPaisa(value: MoneyString | bigint | null | undefined): bigint {
  if (value === null || value === undefined || value === "") return BigInt(0);
  if (typeof value === "bigint") return value;
  const match = MONEY_PATTERN.exec(value.trim());
  if (!match) throw new Error(`Invalid money value: ${value}`);
  const [, sign, whole, fraction = ""] = match;
  const paisa = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return sign === "-" ? -paisa : paisa;
}

/** Convert integer paisa back to a normalized money string, e.g. `-1250.50`. */
export function fromPaisa(paisa: bigint): MoneyString {
  const negative = paisa < BigInt(0);
  const abs = negative ? -paisa : paisa;
  const whole = abs / BigInt(100);
  const fraction = (abs % BigInt(100)).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function normalizeMoney(value: MoneyString | bigint | null | undefined): MoneyString {
  return fromPaisa(toPaisa(value));
}

export function addMoney(...values: Array<MoneyString | bigint | null | undefined>): MoneyString {
  return fromPaisa(values.reduce<bigint>((sum, v) => sum + toPaisa(v), BigInt(0)));
}

export function subtractMoney(a: MoneyString | bigint, b: MoneyString | bigint): MoneyString {
  return fromPaisa(toPaisa(a) - toPaisa(b));
}

export function negateMoney(value: MoneyString | bigint): MoneyString {
  return fromPaisa(-toPaisa(value));
}

export function absMoney(value: MoneyString | bigint): MoneyString {
  const paisa = toPaisa(value);
  return fromPaisa(paisa < BigInt(0) ? -paisa : paisa);
}

export function compareMoney(a: MoneyString | bigint, b: MoneyString | bigint): -1 | 0 | 1 {
  const diff = toPaisa(a) - toPaisa(b);
  if (diff === BigInt(0)) return 0;
  return diff > BigInt(0) ? 1 : -1;
}

export function signOfMoney(value: MoneyString | bigint): -1 | 0 | 1 {
  return compareMoney(value, BigInt(0));
}

export function isZeroMoney(value: MoneyString | bigint): boolean {
  return toPaisa(value) === BigInt(0);
}

/**
 * Percentage of `part` relative to `whole`, rounded to an integer.
 * Returns null when `whole` is zero (no meaningful percentage).
 */
export function percentOf(part: MoneyString | bigint, whole: MoneyString | bigint): number | null {
  const w = toPaisa(whole);
  if (w === BigInt(0)) return null;
  const p = toPaisa(part);
  // Round half away from zero on integers only.
  const scaled = p * BigInt(1000);
  const tenths = scaled / w;
  const rounded = (tenths + (tenths >= BigInt(0) ? BigInt(5) : BigInt(-5))) / BigInt(10);
  return Number(rounded);
}

/** Divide money by an integer count (e.g. average per day), rounded to paisa. */
export function divideMoney(value: MoneyString | bigint, divisor: number): MoneyString {
  if (!Number.isInteger(divisor) || divisor <= 0) throw new Error("Divisor must be a positive integer");
  const paisa = toPaisa(value);
  const d = BigInt(divisor);
  const half = d / BigInt(2);
  const rounded = paisa >= BigInt(0) ? (paisa + half) / d : (paisa - half) / d;
  return fromPaisa(rounded);
}

/** Multiply money by an integer (e.g. projecting a daily average). */
export function multiplyMoney(value: MoneyString | bigint, factor: number): MoneyString {
  if (!Number.isInteger(factor)) throw new Error("Factor must be an integer");
  return fromPaisa(toPaisa(value) * BigInt(factor));
}

/**
 * Parse what a user typed into an amount field. Accepts Bangla digits, commas
 * and spaces. Returns null when the input is not a valid amount with at most
 * two decimals.
 */
export function parseAmountInput(input: string): MoneyString | null {
  const cleaned = input
    .trim()
    .replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] ?? d)
    .replace(/[,\s৳]/g, "");
  if (!/^\d{1,16}(\.\d{0,2})?$/.test(cleaned)) return null;
  return normalizeMoney(cleaned.endsWith(".") ? cleaned.slice(0, -1) : cleaned);
}

/** Lossy conversion for charts only. Never use the result for stored totals. */
export function moneyToChartNumber(value: MoneyString | bigint): number {
  return Number(toPaisa(value)) / 100;
}

/** Round to whole taka (half away from zero) — for estimates and averages shown to users. */
export function roundToWhole(value: MoneyString | bigint): MoneyString {
  const paisa = toPaisa(value);
  const sign = paisa < BigInt(0) ? BigInt(-1) : BigInt(1);
  const abs = paisa * sign;
  const whole = (abs + BigInt(50)) / BigInt(100);
  return fromPaisa(whole * BigInt(100) * sign);
}
