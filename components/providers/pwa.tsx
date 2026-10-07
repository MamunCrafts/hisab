"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/provider";

/** Registers the service worker (production only) and shows an offline banner. */
export function PwaSupport() {
  const { t } = useI18n();
  const online = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);

  if (online) return null;
  return (
    <div role="status" className="no-print fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-sm font-medium text-black">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      {t("common.offline")}
    </div>
  );
}
