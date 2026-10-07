import "server-only";
import { del, get, list, put } from "@vercel/blob";
import { AwsClient } from "aws4fetch";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, type AttachmentType } from "@/lib/constants";

/**
 * Private file storage for receipts and avatars. Uses Cloudflare R2 when
 * configured, then Vercel Private Blob; falls back to the local filesystem in
 * development. Files are only ever served through authenticated routes
 * (/api/attachments/[id], /api/avatar).
 */

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

type R2Config = { client: AwsClient; baseUrl: string };
let r2Cache: R2Config | null | undefined;

function r2(): R2Config | null {
  if (r2Cache !== undefined) return r2Cache;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || (!R2_ACCOUNT_ID && !R2_ENDPOINT)) {
    r2Cache = null;
    return null;
  }
  const endpoint = (R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/+$/, "");
  r2Cache = {
    client: new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    }),
    baseUrl: `${endpoint}/${encodeURIComponent(R2_BUCKET)}`,
  };
  return r2Cache;
}

function r2ObjectUrl(config: R2Config, key: string) {
  return `${config.baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function r2Fetch(config: R2Config, url: string, init?: RequestInit): Promise<Response> {
  return config.client.fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
}

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function isStorageConfigured(): boolean {
  return Boolean(r2()) || blobEnabled() || process.env.NODE_ENV !== "production";
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

export async function storeAttachment(
  userId: string,
  file: ValidatedFile,
  folder: "receipts" | "avatars" = "receipts",
): Promise<string> {
  const key = `${userPrefix(userId)}${folder}/${crypto.randomUUID()}.${EXTENSIONS[file.contentType]}`;
  const r2Config = r2();
  if (r2Config) {
    const res = await r2Fetch(r2Config, r2ObjectUrl(r2Config, key), {
      method: "PUT",
      body: Buffer.from(file.bytes),
      headers: { "Content-Type": file.contentType, "Content-Length": String(file.size) },
    });
    if (!res.ok) throw new Error(`R2 upload failed with status ${res.status}`);
    return key;
  }
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
  const r2Config = r2();
  if (r2Config) {
    const res = await r2Fetch(r2Config, r2ObjectUrl(r2Config, storageKey));
    if (res.status === 404) return null;
    if (!res.ok || !res.body) throw new Error(`R2 read failed with status ${res.status}`);
    return { body: res.body, contentType: res.headers.get("content-type") ?? undefined };
  }
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
    const r2Config = r2();
    if (r2Config) {
      const res = await r2Fetch(r2Config, r2ObjectUrl(r2Config, storageKey), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed with status ${res.status}`);
      return;
    }
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
  const r2Config = r2();
  if (r2Config) {
    let token: string | undefined;
    do {
      const params = new URLSearchParams({ "list-type": "2", prefix, "max-keys": "1000" });
      if (token) params.set("continuation-token", token);
      const res = await r2Fetch(r2Config, `${r2Config.baseUrl}?${params}`);
      if (!res.ok) throw new Error(`R2 list failed with status ${res.status}`);
      const xml = await res.text();
      const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => decodeXml(m[1]));
      for (let i = 0; i < keys.length; i += 10) {
        await Promise.all(keys.slice(i, i + 10).map(deleteAttachmentFile));
      }
      const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      const next = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1];
      token = truncated && next ? decodeXml(next) : undefined;
    } while (token);
    return;
  }
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

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
