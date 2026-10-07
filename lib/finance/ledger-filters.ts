export const LEDGER_FILTERS = ["all", "receivable", "payable", "settled", "overdue", "archived"] as const;
export type LedgerFilter = (typeof LEDGER_FILTERS)[number];
