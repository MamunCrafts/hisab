import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function AppNotFound() {
  const { t } = await getI18n();
  return (
    <EmptyState
      icon={SearchX}
      title={t("common.notFound")}
      description={t("common.notFoundBody")}
      action={
        <Button asChild>
          <Link href="/dashboard">{t("common.goHome")}</Link>
        </Button>
      }
    />
  );
}
