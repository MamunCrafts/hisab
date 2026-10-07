import {
  Banknote,
  Briefcase,
  Bus,
  CircleEllipsis,
  Clapperboard,
  CreditCard,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Whitelisted icons that can be referenced by name from the database. */
export const FINANCE_ICONS: Record<string, LucideIcon> = {
  banknote: Banknote,
  briefcase: Briefcase,
  bus: Bus,
  "circle-ellipsis": CircleEllipsis,
  clapperboard: Clapperboard,
  "credit-card": CreditCard,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  landmark: Landmark,
  laptop: Laptop,
  "piggy-bank": PiggyBank,
  plane: Plane,
  receipt: Receipt,
  "shopping-bag": ShoppingBag,
  smartphone: Smartphone,
  sparkles: Sparkles,
  tag: Tag,
  "trending-up": TrendingUp,
  users: Users,
  utensils: Utensils,
  wallet: Wallet,
};

export const ICON_NAMES = Object.keys(FINANCE_ICONS);

/** Tailwind-safe tinted backgrounds for category colors. */
const TONES: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  stone: "bg-stone-100 text-stone-700 dark:bg-stone-500/15 dark:text-stone-300",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  lime: "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300",
  pink: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300",
};

export const COLOR_NAMES = Object.keys(TONES);

export function toneClass(color: string | null | undefined): string {
  return TONES[color ?? ""] ?? TONES.slate;
}

export function FinanceIcon({
  name,
  color,
  className,
  size = "md",
}: {
  name: string | null | undefined;
  color?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = FINANCE_ICONS[name ?? ""] ?? Tag;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-10 [&_svg]:size-[18px]",
        size === "lg" && "size-12 [&_svg]:size-5",
        toneClass(color),
        className,
      )}
    >
      <Icon />
    </span>
  );
}
