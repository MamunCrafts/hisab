"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Recharts is loaded on demand so it never blocks the first paint. */
export const LazySpendingTrendPanel = dynamic(() => import("./spending-trend-chart").then((m) => m.SpendingTrendPanel), {
  ssr: false,
  loading: () => <Skeleton className="h-[264px] w-full" />,
});

export const LazySpendingTrendChart = dynamic(() => import("./spending-trend-chart").then((m) => m.SpendingTrendChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full" />,
});

export const LazyCategoryDonut = dynamic(() => import("./category-donut").then((m) => m.CategoryDonut), {
  ssr: false,
  loading: () => <Skeleton className="h-44 w-full" />,
});

export const LazyIncomeExpenseBars = dynamic(() => import("./income-expense-bars").then((m) => m.IncomeExpenseBars), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});
