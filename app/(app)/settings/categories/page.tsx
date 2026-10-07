import type { Metadata } from "next";
import { CategoryManager } from "@/components/categories/category-manager";
import { PageHeader } from "@/components/common/page-header";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { listCategories } from "@/db/queries/categories";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("categoryAdmin.title") };
}

export default async function CategoriesPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const categories = await listCategories(user.id);
  return (
    <div className="max-w-2xl">
      <SettingsBackLink />
      <PageHeader title={t("categoryAdmin.title")} description={t("categoryAdmin.description")} />
      <CategoryManager categories={categories} />
    </div>
  );
}
