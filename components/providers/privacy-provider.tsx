"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

const KEY = "hisab:hide-amounts";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(value: boolean) {
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // Storage may be unavailable (private mode); the toggle still works for this page view.
  }
  listeners.forEach((l) => l());
}

type PrivacyContextValue = { hidden: boolean; toggle: () => void };
const PrivacyContext = createContext<PrivacyContextValue>({ hidden: false, toggle: () => {} });

/** "Hide amounts" preference, remembered per device. */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const hidden = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    read,
    () => false,
  );
  const toggle = useCallback(() => write(!read()), []);
  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  return <PrivacyContext value={value}>{children}</PrivacyContext>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
