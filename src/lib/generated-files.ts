import "server-only";
// Server-side CRUD helpers for the `generated_files` catalog + the
// `chat-generated-files` Supabase Storage bucket.
//
// All operations use SUPABASE_SERVICE_ROLE_KEY — never expose to the
// client. Tenant isolation is enforced in every helper by matching the
// Clerk userId against the row's user_id before returning anything.
//
// Storage path pattern: `<user_id>/<file_uuid>.<ext>`.
//
// The table must exist first — see docs/migrations/2026-04-18-generated-files.sql
// and the bucket setup doc at docs/migrations/2026-04-18-chat-generated-files-bucket.md.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ResponseSchema } from "@/lib/documents/response-schema";

export const BUCKET = "chat-generated-files";

export type GeneratedFileFormat =
  | "docx"
  | "pdf"
  | "pptx"
  | "xlsx"
  | "jpg"
  | "png"
  | "txt";

export type GeneratedFileKind = "generated" | "uploaded";

export interface GeneratedFileRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  file_name: string;
  format: string;
  storage_path: string;
  size_bytes: number;
  kind: string;
  doc_type: string | null;
  source_message_id: string | null;
  /** llp-response-schema draft (when Phase-2 emitter produced this file).
   *  null for legacy template-path files. Enables canvas re-edit. */
  draft_json: ResponseSchema | null;
  created_at: string;
  deleted_at: string | null;
}

/**
 * Server-only Supabase client bound to the service-role key. Caller is
 * responsible for enforcing Clerk auth before invoking this.
 */
export function getStorageClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface UploadGeneratedFileOpts {
  userId: string;
  conversationId?: string | null;
  fileName: string;
  format: GeneratedFileFormat;
  kind?: GeneratedFileKind;
  docType?: string | null;
  sourceMessageId?: string | null;
  bytes: Uint8Array | ArrayBuffer | Blob;
  contentType?: string;
  /** llp-response-schema draft — persisted so the user can re-edit
   *  the file in the canvas later without rerunning the agent. */
  draftJson?: ResponseSchema | null;
}

const MIME_BY_FORMAT: Record<GeneratedFileFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  png: "image/png",
  txt: "text/plain",
};

function toArrayBuffer(
  bytes: Uint8Array | ArrayBuffer | Blob
): Promise<ArrayBuffer> {
  if (bytes instanceof ArrayBuffer) return Promise.resolve(bytes);
  if (bytes instanceof Uint8Array) {
    // Make sure we hand off a real ArrayBuffer (not SharedArrayBuffer, typed views, etc.)
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return Promise.resolve(copy.buffer);
  }
  return bytes.arrayBuffer();
}

function sanitizeFilename(name: string): string {
  // Strip path separators and control characters; keep only a safe basename.
  const trimmed = name.replace(/[\\/\x00-\x1f]/g, "_").trim();
  if (!trimmed || trimmed.startsWith(".")) {
    return `file_${Date.now()}`;
  }
  return trimmed.slice(0, 200);
}

/**
 * Upload a file to Supabase Storage and insert a matching row into
 * `generated_files`. Returns the row on success. Throws on any error.
 */
export async function uploadGeneratedFile(
  opts: UploadGeneratedFileOpts
): Promise<GeneratedFileRow> {
  const client = getStorageClient();

  const fileName = sanitizeFilename(opts.fileName);
  const format = opts.format;
  const ext = format.toLowerCase();
  const kind: GeneratedFileKind = opts.kind ?? "generated";
  const contentType =
    opts.contentType ||
    MIME_BY_FORMAT[format] ||
    "application/octet-stream";

  const ab = await toArrayBuffer(opts.bytes);
  const sizeBytes = ab.byteLength;

  // Create a row first so we know its UUID and can derive the storage path.
  const nowIso = new Date().toISOString();
  const insertRes = await client
    .from("generated_files")
    .insert({
      user_id: opts.userId,
      conversation_id: opts.conversationId ?? null,
      file_name: fileName,
      format,
      // Temporary placeholder — we update once the upload succeeds and
      // we have the row id to construct the real path.
      storage_path: `pending/${opts.userId}/${nowIso}-${fileName}`,
      size_bytes: sizeBytes,
      kind,
      doc_type: opts.docType ?? null,
      source_message_id: opts.sourceMessageId ?? null,
      draft_json: opts.draftJson ?? null,
    })
    .select("*")
    .single<GeneratedFileRow>();

  if (insertRes.error || !insertRes.data) {
    throw new Error(
      `generated_files insert failed: ${insertRes.error?.message || "unknown"}`
    );
  }

  const row = insertRes.data;
  const storagePath = `${opts.userId}/${row.id}.${ext}`;

  // Upload the binary to the bucket at the real path.
  const uploadRes = await client.storage
    .from(BUCKET)
    .upload(storagePath, ab, {
      contentType,
      upsert: true,
    });

  if (uploadRes.error) {
    // Clean up the row — best-effort, swallow errors so the original
    // error surfaces.
    await client.from("generated_files").delete().eq("id", row.id);
    throw new Error(
      `Storage upload failed: ${uploadRes.error.message || "unknown"}`
    );
  }

  // Patch the row with the real storage_path.
  const updateRes = await client
    .from("generated_files")
    .update({ storage_path: storagePath })
    .eq("id", row.id)
    .select("*")
    .single<GeneratedFileRow>();

  if (updateRes.error || !updateRes.data) {
    // Upload succeeded but DB update failed — keep the file but still
    // surface an error so the caller can decide.
    throw new Error(
      `generated_files update failed: ${updateRes.error?.message || "unknown"}`
    );
  }

  return updateRes.data;
}

/**
 * List all non-deleted files for a user, newest first.
 */
export async function listUserFiles(
  userId: string,
  limit = 50
): Promise<GeneratedFileRow[]> {
  const client = getStorageClient();
  const res = await client
    .from("generated_files")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    throw new Error(`listUserFiles failed: ${res.error.message}`);
  }
  return (res.data ?? []) as GeneratedFileRow[];
}

/**
 * Fetch a single row, ensuring the caller owns it. Returns null if the
 * row doesn't exist OR belongs to another user OR is soft-deleted.
 */
export async function getOwnedFile(
  fileId: string,
  userId: string
): Promise<GeneratedFileRow | null> {
  const client = getStorageClient();
  const res = await client
    .from("generated_files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle<GeneratedFileRow>();
  if (res.error) {
    throw new Error(`getOwnedFile failed: ${res.error.message}`);
  }
  return res.data ?? null;
}

/**
 * Generate a signed URL for a file that belongs to `userId`.
 * Returns null if ownership fails. Throws on signing errors.
 */
export async function getSignedUrl(
  fileId: string,
  userId: string,
  ttlSeconds = 3600
): Promise<{ url: string; expiresAt: string; file: GeneratedFileRow } | null> {
  const client = getStorageClient();

  const row = await getOwnedFile(fileId, userId);
  if (!row) return null;

  const signed = await client.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, ttlSeconds);

  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(
      `Signed URL generation failed: ${signed.error?.message || "unknown"}`
    );
  }

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return {
    url: signed.data.signedUrl,
    expiresAt,
    file: row,
  };
}

/**
 * Soft-delete: stamp `deleted_at` on the row and (best-effort) remove
 * the object from Storage. Returns true on success, false if the row
 * was not owned by the caller.
 */
export async function softDeleteFile(
  fileId: string,
  userId: string
): Promise<boolean> {
  const client = getStorageClient();

  const row = await getOwnedFile(fileId, userId);
  if (!row) return false;

  const upd = await client
    .from("generated_files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId)
    .eq("user_id", userId);

  if (upd.error) {
    throw new Error(`softDeleteFile update failed: ${upd.error.message}`);
  }

  // Best-effort storage removal — if this fails the row is already
  // marked deleted so the object will just dangle until pruned.
  await client.storage.from(BUCKET).remove([row.storage_path]);
  return true;
}

/**
 * Convenience — convert a row into the shape the client `workspace-store`
 * expects (maps snake_case → camelCase).
 */
export function rowToClientFile(row: GeneratedFileRow) {
  return {
    id: row.id,
    fileName: row.file_name,
    format: row.format as GeneratedFileFormat,
    kind: row.kind as GeneratedFileKind,
    createdAt: row.created_at,
    sizeBytes: row.size_bytes,
    docType: row.doc_type ?? undefined,
    storagePath: row.storage_path,
    conversationId: row.conversation_id,
    sourceMessageId: row.source_message_id,
    draftJson: row.draft_json ?? undefined,
  };
}

export { MIME_BY_FORMAT };
