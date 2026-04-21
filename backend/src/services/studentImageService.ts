import path from "node:path";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const allowedContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AllowedContentType = (typeof allowedContentTypes)[number];

const extByContentType: Record<AllowedContentType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const contentTypeByExt: Record<string, AllowedContentType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const studentAvatarDirectUploadRequestSchema = z.object({
  studentId: z.string().min(1),
  fileName: z.string().min(1).max(255).optional(),
  contentType: z.enum(allowedContentTypes).optional(),
});

export type StudentAvatarDirectUploadInput = z.infer<
  typeof studentAvatarDirectUploadRequestSchema
>;

export class StudentImageServiceError extends Error {
  override readonly name = "StudentImageServiceError";
  constructor(message: string) {
    super(message);
  }
}

export type StudentAvatarDirectUploadUrlResult = {
  /** R2 object key (same shape as former Cloudflare Images id for clients). */
  imageId: string;
  /** Presigned URL; upload with HTTP PUT and body = raw file bytes. */
  uploadURL: string;
  method: "PUT";
  contentType: AllowedContentType;
  /** Absolute URL if `R2_PUBLIC_BASE_URL` is configured (custom domain or r2.dev). */
  publicUrl?: string;
};

function getR2Config(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string | null;
} {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const rawPublic = process.env.R2_PUBLIC_BASE_URL?.trim();
  const publicBaseUrl =
    rawPublic !== undefined && rawPublic !== ""
      ? rawPublic.replace(/\/+$/, "")
      : null;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new StudentImageServiceError(
      "Missing R2 env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME",
    );
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
  };
}

export function sanitizeStudentIdSegment(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 128) : "unknown";
}

const AVATAR_KEY_SUFFIX_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/i;

/**
 * Ensures `objectKey` is an avatar key issued for this student (prefix + UUID filename).
 */
export function validateStudentAvatarObjectKeyForStudent(
  objectKey: string,
  studentId: string,
): void {
  const key = objectKey.trim();
  const segment = sanitizeStudentIdSegment(studentId);
  const prefix = `student-avatars/${segment}/`;
  if (!key.startsWith(prefix)) {
    throw new StudentImageServiceError(
      "Avatar object key does not belong to this student",
    );
  }
  const rest = key.slice(prefix.length);
  if (!AVATAR_KEY_SUFFIX_RE.test(rest)) {
    throw new StudentImageServiceError("Invalid avatar object key format");
  }
}

/** Public URL for displaying an object, when `R2_PUBLIC_BASE_URL` is set. */
export function resolveStudentAvatarPublicUrl(
  objectKey: string | null | undefined,
): string | null {
  if (objectKey == null) return null;
  const key = String(objectKey).trim();
  if (key === "") return null;
  const rawBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (rawBase === undefined || rawBase === "") return null;
  const base = rawBase.replace(/\/+$/, "");
  return `${base}/${key.split("/").map((p) => encodeURIComponent(p)).join("/")}`;
}

function resolveContentTypeAndExt(
  fileName: string | undefined,
  contentType: AllowedContentType | undefined,
): { contentType: AllowedContentType; ext: string } {
  if (fileName !== undefined) {
    const ext = path.extname(fileName).toLowerCase();
    const fromExt = contentTypeByExt[ext];
    if (fromExt !== undefined) {
      if (contentType !== undefined && contentType !== fromExt) {
        throw new StudentImageServiceError(
          "contentType does not match file extension",
        );
      }
      return { contentType: fromExt, ext: extByContentType[fromExt] };
    }
  }
  if (contentType !== undefined) {
    return { contentType, ext: extByContentType[contentType] };
  }
  return { contentType: "image/jpeg", ext: ".jpg" };
}

const PRESIGNED_PUT_EXPIRES_SECONDS = 15 * 60;

/**
 * Issues a presigned PUT URL for uploading a student avatar to Cloudflare R2 (S3-compatible).
 * Client must send: `PUT uploadURL` with header `Content-Type` exactly as returned, body = file bytes.
 */
export async function createStudentAvatarDirectUploadUrl(
  input: unknown,
): Promise<StudentAvatarDirectUploadUrlResult> {
  const parsedResult = studentAvatarDirectUploadRequestSchema.safeParse(input);
  if (!parsedResult.success) {
    throw new StudentImageServiceError(parsedResult.error.message);
  }
  const parsed = parsedResult.data;

  const { contentType, ext } = resolveContentTypeAndExt(
    parsed.fileName,
    parsed.contentType,
  );

  const { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl } =
    getR2Config();

  const segment = sanitizeStudentIdSegment(parsed.studentId);
  const objectKey = `student-avatars/${segment}/${randomUUID()}${ext}`;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadURL = await getSignedUrl(client, command, {
    expiresIn: PRESIGNED_PUT_EXPIRES_SECONDS,
  });

  const result: StudentAvatarDirectUploadUrlResult = {
    imageId: objectKey,
    uploadURL,
    method: "PUT",
    contentType,
  };

  if (publicBaseUrl !== null) {
    result.publicUrl = `${publicBaseUrl}/${objectKey
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/")}`;
  }

  return result;
}
