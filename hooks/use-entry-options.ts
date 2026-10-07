"use client";

import { useEffect, useState } from "react";
import { getEntryOptionsAction, type EntryOptions } from "@/actions/transactions";

// Shown instantly on the next open while fresh options load in the background.
let cached: EntryOptions | null = null;

export function useEntryOptions() {
  const [options, setOptions] = useState<EntryOptions | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getEntryOptionsAction()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          cached = result.data;
          setOptions(result.data);
          setError(null);
        } else {
          setError(result.error);
        }
      })
      .catch(() => active && setError("errors.network"));
    return () => {
      active = false;
    };
  }, [attempt]);

  return { options, error, retry: () => setAttempt((a) => a + 1) };
}

/** Drop the cache after a write so balances/lists are refetched. */
export function invalidateEntryOptions() {
  cached = null;
}

/** Fetch options once the browser is idle, so the first quick-add opens without a skeleton. */
export function prefetchEntryOptions() {
  if (cached) return;
  getEntryOptionsAction()
    .then((result) => {
      if (result.ok && !cached) cached = result.data;
    })
    .catch(() => {});
}
