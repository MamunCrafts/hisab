import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconClass,
  footer,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon: LucideIcon;
  iconClass: string;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", iconClass)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="line-clamp-2 text-xs leading-tight font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="truncate text-lg font-semibold tracking-tight md:text-xl">{value}</div>
      {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
