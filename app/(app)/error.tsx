"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/common/error-view";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Only the digest is logged; it lets server logs be correlated without leaking data.
    console.error("[hisab] page error", error.digest ?? "");
  }, [error]);
  return <ErrorView reset={reset} />;
}
