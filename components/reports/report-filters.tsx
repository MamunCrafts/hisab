"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";

type Option = { id: string; label: string };

export function ReportFilters({
  types,
  params,
  accounts,
  categories,
  contacts,
}: {
  types: readonly string[];
  params: { type: string; from: string; to: string; accountId: string | null; categoryId: string | null; contactId: string | null };
  accounts: Option[];
  categories: Option[];
  contacts: Option[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(params);
  const [pending, startTransition] = useTransition();

  const apply = (next: typeof params) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
  };

  const select = (key: "accountId" | "categoryId" | "contactId", label: TranslationKey, options: Option[], all: TranslationKey) => (
    <div className="grid gap-1.5">
      <Label className="text-xs">{t(label)}</Label>
      <Select value={draft[key] ?? "all"} onValueChange={(v) => setDraft((d) => ({ ...d, [key]: v === "all" ? null : v }))}>
        <SelectTrigger className="w-full" aria-label={t(label)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t(all)}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form
      className="no-print grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4"
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        apply(draft);
      }}
    >
      <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
        <Label className="text-xs">{t("reports.type")}</Label>
        <Select
          value={draft.type}
          onValueChange={(v) => {
            const next = { ...draft, type: v };
            setDraft(next);
            apply(next);
          }}
        >
          <SelectTrigger className="w-full sm:w-80" aria-label={t("reports.type")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>{t(`reports.${type}` as TranslationKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="r-from" className="text-xs">{t("reports.from")}</Label>
        <Input id="r-from" type="date" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="r-to" className="text-xs">{t("reports.to")}</Label>
        <Input id="r-to" type="date" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
      </div>
      {select("accountId", "reports.account_filter", accounts, "transactions.allAccounts")}
      {["expense", "income", "category"].includes(draft.type) ? select("categoryId", "reports.category_filter", categories, "transactions.allCategories") : null}
      {["ledger", "receivable", "payable", "expense", "income"].includes(draft.type) ? select("contactId", "reports.contact_filter", contacts, "transactions.allPeople") : null}
      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>{t("common.apply")}</Button>
      </div>
    </form>
  );
}
