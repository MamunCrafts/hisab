"use client";

import { Download, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AmountInput } from "@/components/finance/amount-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { categoryLabel } from "@/lib/finance/categories";
import { filtersToSearchParams, RANGE_PRESETS, TYPE_FILTERS, type RangePreset, type TransactionFilters } from "@/lib/finance/filters";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

const RANGE_LABEL: Record<RangePreset, TranslationKey> = {
  all: "transactions.rangeAll",
  today: "transactions.rangeToday",
  yesterday: "transactions.rangeYesterday",
  week: "transactions.rangeWeek",
  month: "transactions.rangeMonth",
  lastMonth: "transactions.rangeLastMonth",
  custom: "transactions.rangeCustom",
};

type Option = { id: string; name: string | null; systemKey?: string | null; kind?: string; isArchived?: boolean };

export function TransactionFiltersBar({
  filters,
  accounts,
  categories,
  contacts,
  exportHref,
}: {
  filters: TransactionFilters;
  accounts: Option[];
  categories: Option[];
  contacts?: Option[];
  exportHref?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  const apply = (next: Partial<TransactionFilters>) => {
    const params = filtersToSearchParams({ ...filters, ...next, page: next.page ?? 1 });
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const debouncedSearch = useDebouncedCallback((q: string) => apply({ q: q.trim() || null }), 350);

  const advancedCount = [filters.type, filters.categoryId, filters.accountId, filters.contactId, filters.min, filters.max].filter(Boolean).length;
  const anyActive = advancedCount > 0 || filters.range !== "all" || Boolean(filters.q);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              debouncedSearch(e.target.value);
            }}
            placeholder={t("transactions.searchPlaceholder")}
            aria-label={t("transactions.searchLabel")}
            className="pl-9"
            enterKeyHint="search"
          />
          {pending ? (
            <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setDraft(filters);
            setSheetOpen(true);
          }}
          aria-label={t("common.filters")}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("common.filters")}</span>
          {advancedCount > 0 ? <Badge className="h-5 min-w-5 px-1.5">{advancedCount}</Badge> : null}
        </Button>
        {exportHref ? (
          <Button variant="outline" asChild className="hidden md:inline-flex">
            <a href={exportHref}>
              <Download className="size-4" aria-hidden />
              {t("transactions.exportCsv")}
            </a>
          </Button>
        ) : null}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={t("transactions.range")}>
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={filters.range === preset}
            onClick={() => (preset === "custom" ? (setDraft({ ...filters, range: "custom" }), setSheetOpen(true)) : apply({ range: preset, from: null, to: null }))}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              filters.range === preset ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {t(RANGE_LABEL[preset])}
            {preset === "custom" && filters.range === "custom" && (filters.from || filters.to)
              ? `: ${filters.from ?? "…"} – ${filters.to ?? "…"}`
              : null}
          </button>
        ))}
        {anyActive ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
            {t("transactions.clearFilters")}
          </button>
        ) : null}
      </div>

      <ResponsiveDialog open={sheetOpen} onOpenChange={setSheetOpen} title={t("common.filters")}>
        <form
          className="space-y-4 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSheetOpen(false);
            apply({ ...draft, q: filters.q });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="f-from">{t("common.from")}</Label>
              <Input
                id="f-from"
                type="date"
                value={draft.from ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, range: "custom", from: e.target.value || null }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-to">{t("common.to")}</Label>
              <Input
                id="f-to"
                type="date"
                value={draft.to ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, range: "custom", to: e.target.value || null }))}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("transactions.type")}</Label>
            <Select value={draft.type ?? "all"} onValueChange={(v) => setDraft((d) => ({ ...d, type: v === "all" ? null : (v as TransactionFilters["type"]) }))}>
              <SelectTrigger className="w-full" aria-label={t("transactions.type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("transactions.typeAll")}</SelectItem>
                {TYPE_FILTERS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "LEDGER" ? t("transactions.typeLedger") : t(`transactionTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("transactions.colCategory")}</Label>
            <Select value={draft.categoryId ?? "all"} onValueChange={(v) => setDraft((d) => ({ ...d, categoryId: v === "all" ? null : v }))}>
              <SelectTrigger className="w-full" aria-label={t("transactions.colCategory")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("transactions.allCategories")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {categoryLabel({ name: c.name, systemKey: c.systemKey ?? null }, t)}
                    {c.kind ? ` · ${c.kind === "INCOME" ? t("categoryAdmin.income") : t("categoryAdmin.expense")}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("transactions.colAccount")}</Label>
            <Select value={draft.accountId ?? "all"} onValueChange={(v) => setDraft((d) => ({ ...d, accountId: v === "all" ? null : v }))}>
              <SelectTrigger className="w-full" aria-label={t("transactions.colAccount")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("transactions.allAccounts")}</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {contacts && contacts.length > 0 ? (
            <div className="grid gap-1.5">
              <Label>{t("form.person")}</Label>
              <Select value={draft.contactId ?? "all"} onValueChange={(v) => setDraft((d) => ({ ...d, contactId: v === "all" ? null : v }))}>
                <SelectTrigger className="w-full" aria-label={t("form.person")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("transactions.allPeople")}</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="f-min">{t("transactions.minAmount")}</Label>
              <AmountInput id="f-min" value={draft.min ?? ""} onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value || null }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-max">{t("transactions.maxAmount")}</Label>
              <AmountInput id="f-max" value={draft.max ?? ""} onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value || null }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() =>
                setDraft({ ...filters, range: "all", from: null, to: null, type: null, categoryId: null, accountId: null, contactId: null, min: null, max: null })
              }
            >
              {t("common.reset")}
            </Button>
            <Button type="submit" className="flex-1">
              {t("common.apply")}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
