"use client";

import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCategoryAction, setCategoryArchivedAction, updateCategoryAction } from "@/actions/categories";
import { COLOR_NAMES, FinanceIcon, ICON_NAMES } from "@/components/finance/finance-icon";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invalidateEntryOptions } from "@/hooks/use-entry-options";
import type { CategoryOption } from "@/db/queries/categories";
import { categoryLabel } from "@/lib/finance/categories";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

type Editing = { mode: "create"; kind: "EXPENSE" | "INCOME" } | { mode: "edit"; category: CategoryOption } | null;

function CategoryForm({ editing, onDone }: { editing: NonNullable<Editing>; onDone: () => void }) {
  const { t } = useI18n();
  const initial = editing.mode === "edit" ? editing.category : null;
  const [name, setName] = useState(initial ? categoryLabel(initial, t) : "");
  const [icon, setIcon] = useState(initial?.icon ?? "tag");
  const [color, setColor] = useState(initial?.color ?? "slate");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result =
            editing.mode === "edit"
              ? await updateCategoryAction(editing.category.id, { name, icon, color })
              : await createCategoryAction({ kind: editing.kind, name, icon, color });
          if (!result.ok) {
            setError(result.fieldErrors?.name ?? result.fieldErrors?.["data.name"] ?? undefined);
            if (!result.fieldErrors) toast.error(t(result.error as TranslationKey));
            return;
          }
          toast.success(editing.mode === "edit" ? t("categoryAdmin.updated") : t("categoryAdmin.created"));
          onDone();
        });
      }}
    >
      <div className="flex items-center gap-3">
        <FinanceIcon name={icon} color={color} size="lg" />
        <Field label={t("categoryAdmin.name")} error={error} className="flex-1">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("categoryAdmin.namePlaceholder")} />
        </Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("categoryAdmin.icon")}</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={icon === name}
              aria-label={name}
              onClick={() => setIcon(name)}
              className={cn("rounded-xl p-0.5 ring-2 ring-transparent focus-visible:ring-ring focus-visible:outline-none", icon === name && "ring-primary")}
            >
              <FinanceIcon name={name} color={icon === name ? color : "slate"} size="sm" className="size-9" />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("categoryAdmin.color")}</legend>
        <div className="flex flex-wrap gap-2">
          {COLOR_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={color === name}
              aria-label={name}
              onClick={() => setColor(name)}
              className={cn("rounded-full p-0.5 ring-2 ring-transparent focus-visible:ring-ring focus-visible:outline-none", color === name && "ring-primary")}
            >
              <FinanceIcon name={icon} color={name} size="sm" className="size-8 rounded-full" />
            </button>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: CategoryOption[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();

  const done = () => {
    invalidateEntryOptions();
    setEditing(null);
    router.refresh();
  };

  const toggleArchive = (category: CategoryOption) =>
    startTransition(async () => {
      const result = await setCategoryArchivedAction(category.id, !category.isArchived);
      if (!result.ok) return void toast.error(t(result.error as TranslationKey));
      toast.success(category.isArchived ? t("categoryAdmin.restored") : t("categoryAdmin.archived"));
      done();
    });

  const renderList = (kind: "EXPENSE" | "INCOME") => {
    const list = categories.filter((c) => c.kind === kind);
    const active = list.filter((c) => !c.isArchived);
    const archived = list.filter((c) => c.isArchived);
    const row = (category: CategoryOption) => (
      <li key={category.id} className="flex items-center gap-3 px-3 py-2.5">
        <FinanceIcon name={category.icon} color={category.color} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{categoryLabel(category, t)}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ mode: "edit", category })} aria-label={`${t("common.edit")}: ${categoryLabel(category, t)}`}>
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          onClick={() => toggleArchive(category)}
          aria-label={`${category.isArchived ? t("common.unarchive") : t("common.archive")}: ${categoryLabel(category, t)}`}
        >
          {category.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
        </Button>
      </li>
    );
    return (
      <div className="space-y-5">
        <ul className="divide-y rounded-2xl border bg-card shadow-card">{active.map(row)}</ul>
        <Button variant="outline" onClick={() => setEditing({ mode: "create", kind })}>
          <Plus className="size-4" aria-hidden />
          {t("categoryAdmin.add")}
        </Button>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("categoryAdmin.archivedSection")}</h3>
          <p className="text-xs text-muted-foreground">{t("categoryAdmin.archiveHint")}</p>
          {archived.length > 0 ? (
            <ul className="divide-y rounded-2xl border bg-card opacity-80">{archived.map(row)}</ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("categoryAdmin.emptyArchived")}</p>
          )}
        </section>
      </div>
    );
  };

  return (
    <>
      <Tabs defaultValue="EXPENSE">
        <TabsList className="mb-4">
          <TabsTrigger value="EXPENSE">{t("categoryAdmin.expense")}</TabsTrigger>
          <TabsTrigger value="INCOME">{t("categoryAdmin.income")}</TabsTrigger>
        </TabsList>
        <TabsContent value="EXPENSE">{renderList("EXPENSE")}</TabsContent>
        <TabsContent value="INCOME">{renderList("INCOME")}</TabsContent>
      </Tabs>
      <ResponsiveDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.mode === "edit" ? t("categoryAdmin.edit") : t("categoryAdmin.add")}
      >
        {editing ? <CategoryForm key={editing.mode === "edit" ? editing.category.id : editing.kind} editing={editing} onDone={done} /> : null}
      </ResponsiveDialog>
    </>
  );
}
