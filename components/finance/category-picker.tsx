"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { FinanceIcon } from "@/components/finance/finance-icon";
import { categoryLabel } from "@/lib/finance/categories";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export type PickerCategory = {
  id: string;
  name: string | null;
  systemKey: string | null;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
};

const COLLAPSED_COUNT = 8;

/** Tap-friendly icon grid; the selected category stays visible even when collapsed. */
export function CategoryPicker({
  categories,
  value,
  onChange,
  invalid,
  describedBy,
  labelledBy,
}: {
  categories: PickerCategory[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  describedBy?: string;
  labelledBy?: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const active = categories.filter((c) => !c.isArchived || c.id === value);
  let visible = expanded ? active : active.slice(0, COLLAPSED_COUNT);
  if (!expanded && value && !visible.some((c) => c.id === value)) {
    const selected = active.find((c) => c.id === value);
    if (selected) visible = [...visible.slice(0, COLLAPSED_COUNT - 1), selected];
  }

  if (active.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("form.noCategories")}</p>;
  }

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="grid grid-cols-4 gap-2"
      >
        {visible.map((category) => {
          const selected = category.id === value;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(category.id)}
              className={cn(
                "relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border bg-card px-1 py-2 text-center text-[11px] leading-tight font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:text-xs",
                selected ? "border-primary bg-accent/70 text-accent-foreground" : "hover:bg-muted/60",
                invalid && !value && "border-destructive/50",
              )}
            >
              <FinanceIcon name={category.icon} color={category.color} size="sm" />
              <span className="line-clamp-2 w-full break-words">{categoryLabel(category, t)}</span>
              {selected ? (
                <Check className="absolute top-1.5 right-1.5 size-3.5 text-primary" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
      {active.length > COLLAPSED_COUNT ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-medium text-primary hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? t("form.showFewerCategories") : `${t("form.showAllCategories")} (${active.length})`}
        </button>
      ) : null}
    </div>
  );
}
