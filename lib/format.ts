import { type MoneyString, toPaisa } from "./money";
import type { DateString } from "./dates";
import type { Locale } from "@/lib/i18n/config";

const MONTHS: Record<Locale, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  bn: ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"],
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
};

export function currencySymbol(currency: string = "BDT"): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

/** Group an integer digit string South-Asian style: 1,20,000. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

function groupWestern(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type FormatCurrencyOptions = {
  currency?: string;
  /** Prefix positive values with "+". */
  signed?: boolean;
  /** Always show two decimals instead of hiding `.00`. */
  fixedDecimals?: boolean;
  /** Drop the currency symbol. */
  plain?: boolean;
};

/**
 * Format a money value: ৳500, ৳1,250, ৳1,20,000, ৳1,250.50.
 * Uses Latin digits for both languages so amounts stay unambiguous.
 */
export function formatCurrency(
  value: MoneyString | bigint | null | undefined,
  { currency = "BDT", signed = false, fixedDecimals = false, plain = false }: FormatCurrencyOptions = {},
): string {
  const paisa = toPaisa(value ?? "0");
  const negative = paisa < BigInt(0);
  const abs = negative ? -paisa : paisa;
  const whole = (abs / BigInt(100)).toString();
  const fraction = (abs % BigInt(100)).toString().padStart(2, "0");
  const grouped = currency === "BDT" || currency === "INR" ? groupIndian(whole) : groupWestern(whole);
  const decimals = fixedDecimals || fraction !== "00" ? `.${fraction}` : "";
  const symbol = plain ? "" : currencySymbol(currency);
  const sign = negative ? "−" : signed && abs > BigInt(0) ? "+" : "";
  return `${sign}${symbol}${grouped}${decimals}`;
}

/** Compact amounts for chart axes: ৳1.2k, ৳3.5L (lakh), ৳1.1Cr (crore). */
export function formatCompactCurrency(value: number, currency: string = "BDT"): string {
  const symbol = currencySymbol(currency);
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (currency === "BDT" || currency === "INR") {
    if (abs >= 1e7) return `${sign}${symbol}${trim(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}${symbol}${trim(abs / 1e5)}L`;
  }
  if (abs >= 1e6) return `${sign}${symbol}${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${symbol}${trim(abs / 1e3)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

/** `DD MMM YYYY`, e.g. 07 Oct 2026. */
export function formatDate(date: DateString, locale: Locale = "en"): string {
  const [year, month, day] = date.split("-");
  return `${day} ${MONTHS[locale][Number(month) - 1]} ${year}`;
}

/** `DD MMM`, e.g. 01 Oct. */
export function formatShortDate(date: DateString, locale: Locale = "en"): string {
  const [, month, day] = date.split("-");
  return `${day} ${MONTHS[locale][Number(month) - 1]}`;
}

export function formatMonthYear(date: DateString, locale: Locale = "en"): string {
  const [year, month] = date.split("-");
  return `${MONTHS[locale][Number(month) - 1]} ${year}`;
}

export function monthName(date: DateString, locale: Locale = "en"): string {
  return MONTHS[locale][Number(date.slice(5, 7)) - 1];
}

/** Date + time for timestamps (e.g. "Edited" markers), in the user's timezone. */
export function formatDateTime(value: Date, locale: Locale = "en", timezone = "Asia/Dhaka"): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return `${formatDate(date, locale)}, ${get("hour")}:${get("minute")}`;
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const second = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}
