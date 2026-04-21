import type { Request, Response } from "express";
import { pool } from "../lib/db.js";
import { upsertPortalStudentAvatarObjectKey } from "../repositories/studentAvatarRepository.js";
import { verifyStudentAccessToken } from "../lib/studentAuthToken.js";
import {
  createStudentAvatarDirectUploadUrl,
  resolveStudentAvatarPublicUrl,
  StudentImageServiceError,
  validateStudentAvatarObjectKeyForStudent,
} from "../services/studentImageService.js";

function readOptionalFileName(body: unknown): string | undefined {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const raw = (body as Record<string, unknown>).fileName;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readOptionalBodyStudentId(body: unknown): string | undefined {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const raw = (body as Record<string, unknown>).studentId;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readOptionalContentType(
  body: unknown,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | undefined {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const raw = (body as Record<string, unknown>).contentType;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (
    t === "image/jpeg" ||
    t === "image/png" ||
    t === "image/webp" ||
    t === "image/gif"
  ) {
    return t;
  }
  return undefined;
}

/**
 * POST /api/uploads/student-avatar-url
 * Authorization: Bearer <student access token>
 * Body (optional): { studentId?: string, fileName?: string, contentType?: string }
 * `studentId` in body, if present, must match the token subject.
 * For R2: upload with PUT to `uploadURL`, header `Content-Type` = response `contentType`, body = raw bytes.
 */
export async function postStudentAvatarDirectUploadUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const bodyStudentId = readOptionalBodyStudentId(req.body);
  if (
    bodyStudentId !== undefined &&
    bodyStudentId !== authStudent.studentId
  ) {
    res.status(403).json({
      error: "studentId does not match authenticated student",
    });
    return;
  }

  const fileName = readOptionalFileName(req.body);
  const contentType = readOptionalContentType(req.body);
  const input = {
    studentId: authStudent.studentId,
    ...(fileName !== undefined ? { fileName } : {}),
    ...(contentType !== undefined ? { contentType } : {}),
  };

  try {
    const result = await createStudentAvatarDirectUploadUrl(input);
    res.json({
      imageId: result.imageId,
      uploadURL: result.uploadURL,
      method: result.method,
      contentType: result.contentType,
      ...(result.publicUrl !== undefined
        ? { publicUrl: result.publicUrl }
        : {}),
    });
  } catch (error) {
    if (error instanceof StudentImageServiceError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error("[uploads] student-avatar-url:", error);
    res.status(500).json({ error: "Failed to create upload URL" });
  }
}

function readImageId(body: unknown): string | null {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const raw = (body as Record<string, unknown>).imageId;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t === "" ? null : t;
}

/**
 * PUT /api/student/avatar
 * Authorization: Bearer <student access token>
 * Body: { imageId: string } — R2 object key returned from POST /api/uploads/student-avatar-url
 * after the client has completed the presigned PUT upload.
 */
export async function putStudentAvatar(req: Request, res: Response): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const imageId = readImageId(req.body);
  if (imageId == null) {
    res.status(400).json({ error: "imageId is required" });
    return;
  }

  try {
    validateStudentAvatarObjectKeyForStudent(imageId, authStudent.studentId);
    await upsertPortalStudentAvatarObjectKey(pool, authStudent.studentId, imageId);
    res.json({
      imageId,
      avatarUrl: resolveStudentAvatarPublicUrl(imageId),
    });
  } catch (error) {
    if (error instanceof StudentImageServiceError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("avatar_object_key is missing")) {
      res.status(503).json({ error: msg });
      return;
    }
    console.error("[student] avatar:", error);
    res.status(500).json({ error: "Failed to save avatar" });
  }
}
