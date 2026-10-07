import {
  ArrowLeftRight,
  BookUser,
  ChartPie,
  FileText,
  LayoutDashboard,
  Repeat,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translate";

export type NavItem = { href: string; label: TranslationKey; icon: LucideIcon };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "nav.transactions", icon: ArrowLeftRight },
  { href: "/ledger", label: "nav.ledger", icon: BookUser },
  { href: "/analytics", label: "nav.analytics", icon: ChartPie },
  { href: "/accounts", label: "nav.accounts", icon: Wallet },
  { href: "/budgets", label: "nav.budgets", icon: Target },
  { href: "/recurring", label: "nav.recurring", icon: Repeat },
  { href: "/reports", label: "nav.reports", icon: FileText },
  { href: "/settings", label: "nav.settings", icon: Settings },
];

/** Shown in the mobile "More" sheet. */
export const MORE_NAV: NavItem[] = PRIMARY_NAV.filter(
  (item) => !["/dashboard", "/transactions", "/ledger"].includes(item.href),
);

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
