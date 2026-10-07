"use client";

import { useId, type ReactElement, type ReactNode, cloneElement, isValidElement } from "react";
import { Label } from "@/components/ui/label";
import { ATTACHMENT_MAX_MB } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: ReactNode;
  /** Translation key (or plain text) of the validation error. */
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  labelAction?: ReactNode;
  children: ReactElement<Record<string, unknown>>;
};

/** Label + control + hint + error, wired up with ids and ARIA attributes. */
export function Field({ label, error, hint, optional, className, labelAction, children }: FieldProps) {
  const { t } = useI18n();
  const id = useId();
  const controlId = (children.props.id as string | undefined) ?? id;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const message = error ? (error.startsWith("validation.") || error.startsWith("errors.") ? t(error as TranslationKey, { size: ATTACHMENT_MAX_MB }) : error) : null;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={controlId} className="text-sm font-medium">
          {label}
          {optional ? <span className="font-normal text-muted-foreground"> ({t("common.optional")})</span> : null}
        </Label>
        {labelAction}
      </div>
      {isValidElement(children)
        ? cloneElement(children, {
            id: controlId,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
          })
        : children}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
