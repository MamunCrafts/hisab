"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { prefetchEntryOptions } from "@/hooks/use-entry-options";

export type QuickAddKind = "EXPENSE" | "INCOME" | "TRANSFER" | "LEND" | "BORROW" | "DEBT_RECEIVED" | "DEBT_PAID";

export type QuickAddRequest = {
  kind?: QuickAddKind;
  /** Pre-select a person for ledger entries. */
  contactId?: string;
};

type QuickAddContextValue = {
  open: boolean;
  request: QuickAddRequest;
  openQuickAdd: (request?: QuickAddRequest) => void;
  setOpen: (open: boolean) => void;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<QuickAddRequest>({});

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = idle(() => prefetchEntryOptions());
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, []);

  const openQuickAdd = useCallback((next: QuickAddRequest = {}) => {
    setRequest(next);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ open, request, openQuickAdd, setOpen }), [open, request, openQuickAdd]);
  return <QuickAddContext value={value}>{children}</QuickAddContext>;
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return ctx;
}
