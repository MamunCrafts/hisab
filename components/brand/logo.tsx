import { cn } from "@/lib/utils";

/** Hisab mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      {/* A tally-khata page: ruled lines with a margin tick. */}
      <path
        d="M9 10.5h3m4 0h7M9 16h3m4 0h7M9 21.5h3m4 0h4.5"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, label = "Hisab" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">{label}</span>
    </span>
  );
}
