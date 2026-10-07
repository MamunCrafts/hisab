import type { Metadata } from "next";
import { SearchPanel } from "@/components/search/search-results";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("search.open") };
}

export default async function SearchPage() {
  await requireUser();
  return (
    <div className="-mx-4 -mt-4 min-h-[70dvh] bg-card md:mx-auto md:mt-0 md:max-w-2xl md:rounded-2xl md:border">
      <SearchPanel />
    </div>
  );
}
