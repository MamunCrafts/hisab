"use client";

import { usePrivacy } from "@/components/providers/privacy-provider";
import { TONE_TEXT, type AmountTone } from "@/lib/finance/display";
import { formatCurrency } from "@/lib/format";
import { absMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Formatted amount that respects the "hide amounts" preference. */
export function Money({
  value,
  currency = "BDT",
  sign,
  tone,
  className,
  showSignedValue,
}: {
  value: string;
  currency?: string;
  /** Explicit sign to show in front of the absolute value. */
  sign?: "+" | "−" | "";
  tone?: AmountTone;
  className?: string;
  /** Format the raw signed value (e.g. net cash flow) instead of using `sign`. */
  showSignedValue?: boolean;
}) {
  const { hidden } = usePrivacy();
  const text = hidden
    ? `${sign ?? ""}৳ ••••`
    : showSignedValue
      ? formatCurrency(value, { currency })
      : `${sign ?? ""}${sign ? " " : ""}${formatCurrency(absMoney(value), { currency })}`;
  return <span className={cn("tabular whitespace-nowrap", tone && TONE_TEXT[tone], className)}>{text}</span>;
}
