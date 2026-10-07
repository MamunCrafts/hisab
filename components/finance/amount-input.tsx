"use client";

import { forwardRef, type ComponentProps } from "react";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

type AmountInputProps = Omit<ComponentProps<"input">, "type" | "size"> & {
  currency?: string;
  variant?: "md" | "xl";
};

/** Amount field with numeric keypad on mobile and a currency prefix. */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { currency = "BDT", variant = "md", className, inputMode = "decimal", ...props },
  ref,
) {
  return (
    <div
      className={cn(
        "flex w-full items-center rounded-lg border border-input bg-card transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20",
        variant === "xl" ? "h-16 rounded-2xl px-4" : "h-11 px-3 md:h-10",
        className,
      )}
    >
      <span aria-hidden className={cn("text-muted-foreground select-none", variant === "xl" ? "text-3xl font-medium" : "text-sm")}>
        {currencySymbol(currency)}
      </span>
      <input
        ref={ref}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        enterKeyHint="next"
        className={cn(
          "tabular h-full w-full min-w-0 bg-transparent pl-1.5 outline-none placeholder:text-muted-foreground/60",
          variant === "xl" ? "text-3xl font-semibold tracking-tight" : "text-base md:text-sm",
        )}
        {...props}
      />
    </div>
  );
});
