"use client";

import { forwardRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type DateFieldProps = Omit<ComponentProps<"input">, "type" | "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  today: string;
  quickPicks?: boolean;
};

/** Native date input (best mobile accessibility) with Today / Yesterday shortcuts. */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { value, onChange, today, quickPicks = true, className, ...props },
  ref,
) {
  const { t } = useI18n();
  const yesterday = addDays(today, -1);
  return (
    <div className="flex items-center gap-2">
      <Input
        ref={ref}
        type="date"
        value={value}
        max="2100-12-31"
        onChange={(e) => onChange(e.target.value)}
        className={cn("tabular min-w-0 flex-1", className)}
        {...props}
      />
      {quickPicks ? (
        <div className="flex shrink-0 gap-1" role="group">
          {[
            { date: today, label: t("common.today") },
            { date: yesterday, label: t("common.yesterday") },
          ].map((pick) => (
            <button
              key={pick.date}
              type="button"
              onClick={() => onChange(pick.date)}
              aria-pressed={value === pick.date}
              className={cn(
                "h-11 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:h-10",
                value === pick.date ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {pick.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
