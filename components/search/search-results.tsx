"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchAction } from "@/actions/search";
import { FinanceIcon } from "@/components/finance/finance-icon";
import { Money } from "@/components/finance/money";
import { TransactionIcon, transactionPrimaryLabel, transactionSecondaryLabel } from "@/components/finance/transaction-visuals";
import { PRIMARY_NAV } from "@/components/layout/nav-items";
import { ContactAvatar } from "@/components/ledger/contact-picker";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { SearchResults } from "@/db/queries/search";
import { categoryLabel } from "@/lib/finance/categories";
import { amountPresentation } from "@/lib/finance/display";
import { formatShortDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";

/** Shared search UI for the desktop palette and the mobile full-screen page. */
export function SearchPanel({ onNavigate, autoFocus = true }: { onNavigate?: () => void; autoFocus?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  const run = useDebouncedCallback(async (q: string) => {
    const id = ++latest.current;
    if (q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    const result = await searchAction(q);
    if (id !== latest.current) return;
    setLoading(false);
    setResults(result.ok ? result.data : null);
  }, 250);

  useEffect(() => () => void (latest.current = -1), []);

  const go = (href: string) => {
    onNavigate?.();
    router.push(href);
  };
  const short = query.trim().length < 2;

  return (
    <Command shouldFilter={false} className="rounded-none bg-transparent">
      <div className="relative">
        <CommandInput
          autoFocus={autoFocus}
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setLoading(v.trim().length >= 2);
            run(v);
          }}
          placeholder={t("search.placeholder")}
          aria-label={t("search.open")}
        />
        {loading ? <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label={t("search.searching")} /> : null}
      </div>
      <CommandList className="max-h-[min(70dvh,520px)]">
        {short ? (
          <CommandGroup heading={t("search.pages")}>
            {PRIMARY_NAV.map((item) => (
              <CommandItem key={item.href} value={item.href} onSelect={() => go(item.href)}>
                <item.icon className="size-4" aria-hidden />
                {t(item.label)}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {!short && !loading && results && results.transactions.length + results.contacts.length + results.accounts.length + results.categories.length === 0 ? (
          <CommandEmpty>
            <Search className="mx-auto mb-2 size-5 text-muted-foreground" aria-hidden />
            {t("search.empty")}
          </CommandEmpty>
        ) : null}
        {!short && results ? (
          <>
            {results.contacts.length > 0 ? (
              <CommandGroup heading={t("search.contacts")}>
                {results.contacts.map((c) => (
                  <CommandItem key={c.id} value={`c-${c.id}`} onSelect={() => go(`/ledger/${c.id}`)}>
                    <ContactAvatar initial={c.avatarInitial} className="size-7 text-[10px]" />
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.phone ? <span className="text-xs text-muted-foreground">{c.phone}</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {results.transactions.length > 0 ? (
              <CommandGroup heading={t("search.transactions")}>
                {results.transactions.map((tx) => {
                  const { sign, tone } = amountPresentation(tx);
                  return (
                    <CommandItem key={tx.id} value={`t-${tx.id}`} onSelect={() => go(`/transactions/${tx.id}`)}>
                      <TransactionIcon tx={tx} className="size-7 [&_svg]:size-3.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{transactionPrimaryLabel(tx, t)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatShortDate(tx.transactionDate, locale)} · {transactionSecondaryLabel(tx, t)}
                        </span>
                      </span>
                      <Money value={tx.amount} sign={sign} tone={tone} currency={results.currency} className="text-xs font-semibold" />
                    </CommandItem>
                  );
                })}
                <CommandItem value="all-tx" onSelect={() => go(`/transactions?q=${encodeURIComponent(query.trim())}`)} className="text-primary">
                  <Search className="size-4" aria-hidden />
                  {t("common.viewAll")}
                </CommandItem>
              </CommandGroup>
            ) : null}
            {results.accounts.length > 0 ? (
              <CommandGroup heading={t("search.accounts")}>
                {results.accounts.map((a) => (
                  <CommandItem key={a.id} value={`a-${a.id}`} onSelect={() => go(`/transactions?accountId=${a.id}`)}>
                    <FinanceIcon name={a.icon} color="emerald" size="sm" className="size-7" />
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{t(`accountTypes.${a.type}`)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {results.categories.length > 0 ? (
              <CommandGroup heading={t("search.categories")}>
                {results.categories.map((c) => (
                  <CommandItem key={c.id} value={`k-${c.id}`} onSelect={() => go(`/transactions?categoryId=${c.id}`)}>
                    <FinanceIcon name={c.icon} color={c.color} size="sm" className="size-7" />
                    <span className="flex-1 truncate">{categoryLabel(c, t)}</span>
                    <span className="text-xs text-muted-foreground">{t(`transactionTypes.${c.kind}`)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </>
        ) : null}
      </CommandList>
    </Command>
  );
}
