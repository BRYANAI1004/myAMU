import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin.js";

const SIGNED_URL_TTL_SECONDS = 3600;
const STORAGE_PREFIX = "admin-email-logs";

let bucketEnsured = false;

function requireSupabaseStorageConfig(): {
  bucket: string;
} {
  const url = env.supabase.url;
  const serviceRoleKey = env.supabase.serviceRoleKey;
  const bucket = env.supabase.emailLogsStorageBucket.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase storage configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (bucket === "") {
    throw new Error("ADMIN_EMAIL_LOGS_STORAGE_BUCKET cannot be empty.");
  }

  return { bucket };
}

function getSupabaseClient(): SupabaseClient {
  return getSupabaseAdminClient();
}

async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const cfg = requireSupabaseStorageConfig();
  const client = getSupabaseClient();
  const { data: buckets, error: listErr } = await client.storage.listBuckets();
  if (listErr) {
    throw new Error(`Supabase listBuckets failed: ${listErr.message}`);
  }
  if (buckets?.some((bucket) => bucket.name === cfg.bucket)) {
    bucketEnsured = true;
    return;
  }
  const { error: createErr } = await client.storage.createBucket(cfg.bucket, {
    public: false,
  });
  if (
    createErr &&
    !createErr.message.toLowerCase().includes("already exists")
  ) {
    throw new Error(`Supabase createBucket failed: ${createErr.message}`);
  }
  bucketEnsured = true;
}

function sanitizeFilename(filename: string): string {
  const base = filename.trim().replace(/[/\\<>:"|?*\u0000-\u001f]/g, "_");
  return base.slice(0, 180) || "attachment";
}

function guessContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}

function buildStoragePath(logId: number, filename: string): string {
  const rand = randomBytes(4).toString("hex");
  return `${STORAGE_PREFIX}/${logId}/${Date.now()}-${rand}-${sanitizeFilename(filename)}`;
}

export async function uploadAdminEmailLogAttachment(input: {
  logId: number;
  filename: string;
  fileBuffer: Buffer;
  contentType?: string | null;
}): Promise<{ storagePath: string; contentType: string; byteSize: number }> {
  const cfg = requireSupabaseStorageConfig();
  await ensureBucket();
  const contentType =
    input.contentType?.trim() || guessContentType(input.filename);
  const path = buildStoragePath(input.logId, input.filename);
  const client = getSupabaseClient();

  const { error } = await client.storage.from(cfg.bucket).upload(path, input.fileBuffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return {
    storagePath: path,
    contentType,
    byteSize: input.fileBuffer.length,
  };
}

export async function createAdminEmailLogAttachmentSignedUrl(
  storagePath: string,
  ttlSeconds = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const cfg = requireSupabaseStorageConfig();
  const path = storagePath.trim();
  if (path === "") throw new Error("storagePath is required.");
  const client = getSupabaseClient();

  const { data, error } = await client.storage
    .from(cfg.bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create signed URL.");
  }
  return data.signedUrl;
}

/** Ensures the email-log attachments bucket exists (call on server startup). */
export async function ensureAdminEmailLogStorageBucket(): Promise<void> {
  await ensureBucket();
}
