import "server-only";
import { del, get, list, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, type AttachmentType } from "@/lib/constants";

/**
 * Private file storage for receipts. Uses Vercel Private Blob when configured;
 * falls back to the local filesystem in development. Files are only ever
 * served through the authenticated /api/attachments/[id] route.
 */

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function isStorageConfigured(): boolean {
  return blobEnabled() || process.env.NODE_ENV !== "production";
}

const EXTENSIONS: Record<AttachmentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Detect the real file type from magic bytes rather than trusting the browser. */
export function sniffAttachmentType(bytes: Uint8Array): AttachmentType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

export type ValidatedFile = { bytes: Uint8Array; contentType: AttachmentType; size: number; name: string };

export type FileValidationError = "type" | "size";

export async function validateAttachment(
  file: File,
): Promise<{ ok: true; file: ValidatedFile } | { ok: false; error: FileValidationError }> {
  if (file.size > ATTACHMENT_MAX_BYTES) return { ok: false, error: "size" };
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return { ok: false, error: "type" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffAttachmentType(bytes);
  if (!sniffed) return { ok: false, error: "type" };
  const name = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "receipt";
  return { ok: true, file: { bytes, contentType: sniffed, size: bytes.byteLength, name } };
}

function userPrefix(userId: string) {
  return `users/${userId}/`;
}

export async function storeAttachment(userId: string, file: ValidatedFile): Promise<string> {
  const key = `${userPrefix(userId)}receipts/${crypto.randomUUID()}.${EXTENSIONS[file.contentType]}`;
  if (blobEnabled()) {
    const result = await put(key, Buffer.from(file.bytes), {
      access: "private",
      contentType: file.contentType,
      addRandomSuffix: false,
    });
    return result.pathname;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("File storage is not configured");
  }
  const target = path.join(LOCAL_ROOT, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, file.bytes);
  return key;
}

export async function readAttachment(
  storageKey: string,
): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array; contentType?: string } | null> {
  if (blobEnabled()) {
    const result = await get(storageKey, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return { body: result.stream, contentType: result.blob.contentType };
  }
  try {
    const target = path.join(LOCAL_ROOT, storageKey);
    if (!target.startsWith(LOCAL_ROOT)) return null;
    return { body: new Uint8Array(await readFile(target)) };
  } catch {
    return null;
  }
}

export async function deleteAttachmentFile(storageKey: string): Promise<void> {
  try {
    if (blobEnabled()) {
      await del(storageKey);
      return;
    }
    const target = path.join(LOCAL_ROOT, storageKey);
    if (target.startsWith(LOCAL_ROOT)) await rm(target, { force: true });
  } catch (error) {
    // A missing file must not block deleting the financial record.
    console.error("[storage] Failed to delete attachment", error instanceof Error ? error.message : error);
  }
}

/** Removes every stored file for a user (account deletion). */
export async function deleteAllUserAttachments(userId: string): Promise<void> {
  const prefix = userPrefix(userId);
  if (blobEnabled()) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      if (page.blobs.length > 0) await del(page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return;
  }
  await rm(path.join(LOCAL_ROOT, prefix), { recursive: true, force: true });
}
