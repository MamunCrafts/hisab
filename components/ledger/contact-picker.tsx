"use client";

import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createContactAction } from "@/actions/contacts";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export type PickerContact = { id: string; name: string; avatarInitial: string; phone: string | null };

export function ContactAvatar({ initial, className }: { initial: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-receivable-soft text-xs font-semibold text-receivable",
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** Inline searchable person picker that can create a new person on the spot. */
export function ContactPicker({
  id,
  contacts,
  value,
  onChange,
  onCreated,
  invalid,
  describedBy,
}: {
  id: string;
  contacts: PickerContact[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (contact: PickerContact) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(!value);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = contacts.find((c) => c.id === value);
  const trimmed = query.trim();
  const exactMatch = contacts.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  const create = () =>
    startTransition(async () => {
      const result = await createContactAction({ name: trimmed });
      if (!result.ok) {
        toast.error(t((result.fieldErrors?.name ?? result.error) as TranslationKey));
        return;
      }
      onCreated(result.data);
      onChange(result.data.id);
      setQuery("");
      setOpen(false);
    });

  if (!open && selected) {
    return (
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        aria-describedby={describedBy}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-primary bg-accent/50 px-3 py-2 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ContactAvatar initial={selected.avatarInitial} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{selected.name}</span>
          {selected.phone ? <span className="block text-xs text-muted-foreground">{selected.phone}</span> : null}
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
      </button>
    );
  }

  return (
    <Command
      className={cn("rounded-xl border bg-card", invalid && "border-destructive/60")}
      filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
    >
      <CommandInput
        id={id}
        value={query}
        onValueChange={setQuery}
        placeholder={t("form.searchPeople")}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
      <CommandList className="max-h-56">
        {contacts.length === 0 && !trimmed ? <CommandEmpty>{t("form.noPeople")}</CommandEmpty> : null}
        <CommandGroup>
          {contacts.map((contact) => (
            <CommandItem
              key={contact.id}
              value={`${contact.name} ${contact.phone ?? ""} ${contact.id}`}
              onSelect={() => {
                onChange(contact.id);
                setOpen(false);
                setQuery("");
              }}
              className="gap-3 py-2"
            >
              <ContactAvatar initial={contact.avatarInitial} className="size-8" />
              <span className="flex-1 truncate">{contact.name}</span>
              {contact.id === value ? <Check className="size-4 text-primary" aria-hidden /> : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      {trimmed && !exactMatch ? (
        <div className="border-t p-1.5">
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={create} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
            {t("form.addPersonNamed", { name: trimmed })}
          </Button>
        </div>
      ) : null}
    </Command>
  );
}
