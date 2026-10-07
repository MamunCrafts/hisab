"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/provider";
import { SearchPanel } from "./search-results";

/** Desktop: Ctrl/Cmd+K palette. Mobile: a search icon that opens the full-screen /search page. */
export function CommandPalette() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) setOpen((o) => !o);
        else router.push("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-10 w-64 justify-start gap-2 text-muted-foreground md:inline-flex lg:w-80"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 truncate text-left">{t("search.open")}…</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <Button variant="ghost" size="icon" asChild className="md:hidden">
        <Link href="/search" aria-label={t("search.open")}>
          <Search className="size-5" />
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">{t("search.open")}</DialogTitle>
          <SearchPanel onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
