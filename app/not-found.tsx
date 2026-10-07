import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <SearchX className="size-6" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold">{t("common.notFound")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("common.notFoundBody")}</p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">{t("common.goHome")}</Link>
      </Button>
    </main>
  );
}
