import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export async function SettingsBackLink() {
  const { t } = await getI18n();
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
      <Link href="/settings">
        <ArrowLeft className="size-4" aria-hidden />
        {t("nav.settings")}
      </Link>
    </Button>
  );
}
