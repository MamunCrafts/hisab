import type { Locale } from "@/lib/i18n/config";

export const DEFAULT_CURRENCY = "BDT";
export const DEFAULT_TIMEZONE = "Asia/Dhaka";

/** Attachment rules for receipts and documents. */
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_MAX_MB = 5;
export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const EXPENSE_CATEGORY_KEYS = [
  "food",
  "transport",
  "shopping",
  "bills",
  "rent",
  "health",
  "education",
  "entertainment",
  "family",
  "travel",
  "business",
  "other",
] as const;

export const INCOME_CATEGORY_KEYS = [
  "salary",
  "business",
  "freelance",
  "bonus",
  "investment",
  "gift",
  "other",
] as const;

export type CategoryKey = (typeof EXPENSE_CATEGORY_KEYS)[number] | (typeof INCOME_CATEGORY_KEYS)[number];

/** Default icon (lucide name) and color token per starter category. */
export const CATEGORY_STYLE: Record<CategoryKey, { icon: string; color: string }> = {
  food: { icon: "utensils", color: "amber" },
  transport: { icon: "bus", color: "sky" },
  shopping: { icon: "shopping-bag", color: "violet" },
  bills: { icon: "receipt", color: "rose" },
  rent: { icon: "home", color: "orange" },
  health: { icon: "heart-pulse", color: "red" },
  education: { icon: "graduation-cap", color: "indigo" },
  entertainment: { icon: "clapperboard", color: "fuchsia" },
  family: { icon: "users", color: "teal" },
  travel: { icon: "plane", color: "cyan" },
  business: { icon: "briefcase", color: "slate" },
  other: { icon: "circle-ellipsis", color: "stone" },
  salary: { icon: "wallet", color: "emerald" },
  freelance: { icon: "laptop", color: "teal" },
  bonus: { icon: "sparkles", color: "amber" },
  investment: { icon: "trending-up", color: "lime" },
  gift: { icon: "gift", color: "pink" },
};

export const STARTER_ACCOUNTS = [
  { key: "cash", type: "CASH", icon: "banknote" },
  { key: "bank", type: "BANK", icon: "landmark" },
  { key: "bkash", type: "MOBILE_WALLET", icon: "smartphone" },
  { key: "nagad", type: "MOBILE_WALLET", icon: "smartphone" },
  { key: "rocket", type: "MOBILE_WALLET", icon: "smartphone" },
  { key: "card", type: "CARD", icon: "credit-card" },
] as const;

export type StarterAccountKey = (typeof STARTER_ACCOUNTS)[number]["key"];

export const LOCALE_LABELS: Record<Locale, string> = { bn: "বাংলা", en: "English" };

export const SUPPORTED_CURRENCIES = ["BDT", "USD", "EUR", "GBP", "INR"] as const;

export const TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;
