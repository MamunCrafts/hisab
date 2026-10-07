"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createContactAction, updateContactAction } from "@/actions/contacts";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { contactSchema } from "@/lib/validation/contact";

type Values = { name: string; phone: string; email: string; note: string };

export function ContactForm({
  contact,
  onSaved,
}: {
  contact?: { id: string; name: string; phone: string | null; email: string | null; note: string | null };
  onSaved: (id: string) => void;
}) {
  const { t } = useI18n();
  const form = useForm<Values>({
    resolver: zodResolver(contactSchema) as never,
    defaultValues: { name: contact?.name ?? "", phone: contact?.phone ?? "", email: contact?.email ?? "", note: contact?.note ?? "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit() {
    const values = form.getValues();
    const result = contact ? await updateContactAction(contact.id, values) : await createContactAction(values);
    if (!result.ok) {
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(name.replace(/^data\./, "") as keyof Values, { message });
      }
      if (!result.fieldErrors) toast.error(t(result.error as TranslationKey));
      return;
    }
    toast.success(contact ? t("ledger.personSaved") : t("ledger.personCreated"));
    onSaved(contact?.id ?? (result.data as { id: string }).id);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4 pb-2">
      <Field label={t("ledger.personName")} error={errors.name?.message}>
        <Input autoFocus autoComplete="off" {...form.register("name")} />
      </Field>
      <Field label={t("ledger.phone")} optional error={errors.phone?.message}>
        <Input type="tel" inputMode="tel" autoComplete="off" placeholder="01XXXXXXXXX" {...form.register("phone")} />
      </Field>
      <Field label={t("ledger.email")} optional error={errors.email?.message}>
        <Input type="email" inputMode="email" autoComplete="off" {...form.register("email")} />
      </Field>
      <Field label={t("ledger.personNote")} optional error={errors.note?.message}>
        <Textarea rows={2} {...form.register("note")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
