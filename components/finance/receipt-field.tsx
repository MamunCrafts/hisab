"use client";

import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_MAX_MB, ATTACHMENT_TYPES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/provider";

export type ExistingAttachment = { id: string; contentType: string; originalName: string };

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Optional private receipt: add, view, replace or remove. */
export function ReceiptField({
  id,
  file,
  onFileChange,
  existing,
  removeExisting,
  onRemoveExistingChange,
  describedBy,
}: {
  id: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  existing?: ExistingAttachment | null;
  removeExisting: boolean;
  onRemoveExistingChange: (remove: boolean) => void;
  describedBy?: string;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const showExisting = existing && !file && !removeExisting;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ATTACHMENT_TYPES.join(",")}
        className="sr-only"
        aria-describedby={describedBy}
        onChange={(e) => {
          onFileChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {file.type === "application/pdf" ? <FileText className="size-5" aria-hidden /> : <ImageIcon className="size-5" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onFileChange(null)} aria-label={t("form.receiptRemove")}>
            <X className="size-4" />
          </Button>
        </div>
      ) : showExisting ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
          {existing.contentType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image
            <img src={`/api/attachments/${existing.id}`} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-5" aria-hidden />
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{existing.originalName}</p>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="sm" asChild>
              <a href={`/api/attachments/${existing.id}`} target="_blank" rel="noopener">
                {t("form.receiptView")}
              </a>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
              {t("form.receiptReplace")}
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemoveExistingChange(true)} aria-label={t("form.receiptRemove")}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button type="button" variant="outline" className="w-full justify-start border-dashed" onClick={() => inputRef.current?.click()}>
            <Paperclip className="size-4" aria-hidden />
            {t("form.receiptAdd")}
          </Button>
          {existing && removeExisting ? (
            <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              {t("form.receiptWillRemove")}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => onRemoveExistingChange(false)}>
                {t("common.cancel")}
              </button>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("form.receiptHint", { size: ATTACHMENT_MAX_MB })}</p>
          )}
        </>
      )}
    </div>
  );
}
