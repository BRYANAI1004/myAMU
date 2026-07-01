import type { Request, Response } from "express";
import {
  findAdminEmailLogAttachment,
  listAdminEmailLogAttachmentsByLogIds,
} from "../repositories/adminEmailLogAttachmentRepository.js";
import { listAdminEmailLogs } from "../repositories/adminEmailLogRepository.js";
import { createAdminEmailLogAttachmentSignedUrl } from "../services/adminEmailLogStorageService.js";

function parsePageParam(raw: unknown, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.trunc(n);
}

function parsePositiveIntParam(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

function serializeLog(
  row: Awaited<ReturnType<typeof listAdminEmailLogs>>["items"][number],
  attachments: Array<{
    id: number;
    filename: string;
    byteSize: number;
    contentType: string | null;
  }>,
) {
  return {
    id: row.id,
    kind: row.kind,
    sentByAdminEmail: row.sentByAdminEmail,
    sentByDisplayName: row.sentByDisplayName,
    fromAddress: row.fromAddress,
    subject: row.subject,
    recipientCount: row.recipientCount,
    deliveryMode: row.deliveryMode,
    delivered: row.delivered,
    messageId: row.messageId,
    smtpProfileId: row.smtpProfileId,
    attachmentCount: row.attachmentCount,
    attachmentNames: row.attachmentNames,
    attachments,
    note: row.note,
    createdAt: row.createdAt,
  };
}

/** GET /api/admin/email-logs — paginated send history. */
export async function getAdminEmailLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const page = parsePageParam(req.query.page, 1);
  const pageSize = parsePageParam(req.query.pageSize, 25);

  try {
    const result = await listAdminEmailLogs({ page, pageSize });
    const attachmentMap = await listAdminEmailLogAttachmentsByLogIds(
      result.items.map((row) => row.id),
    );

    res.json({
      items: result.items.map((row) =>
        serializeLog(
          row,
          (attachmentMap.get(row.id) ?? []).map((attachment) => ({
            id: attachment.id,
            filename: attachment.filename,
            byteSize: attachment.byteSize,
            contentType: attachment.contentType,
          })),
        ),
      ),
      total: result.total,
      page,
      pageSize,
    });
  } catch (e) {
    console.error("[admin/email-logs] list failed", e);
    res.status(500).json({ error: "Failed to load email logs." });
  }
}

/** GET /api/admin/email-logs/:logId/attachments/:attachmentId/url — signed download URL. */
export async function getAdminEmailLogAttachmentUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const logId = parsePositiveIntParam(req.params.logId);
  const attachmentId = parsePositiveIntParam(req.params.attachmentId);
  if (logId == null || attachmentId == null) {
    res.status(400).json({ error: "Invalid log or attachment id." });
    return;
  }

  try {
    const attachment = await findAdminEmailLogAttachment(logId, attachmentId);
    if (attachment == null) {
      res.status(404).json({ error: "Attachment not found." });
      return;
    }

    const url = await createAdminEmailLogAttachmentSignedUrl(
      attachment.storagePath,
    );
    res.json({
      url,
      filename: attachment.filename,
      contentType: attachment.contentType,
      byteSize: attachment.byteSize,
    });
  } catch (e) {
    console.error("[admin/email-logs] attachment url failed", e);
    res.status(500).json({ error: "Could not create download link." });
  }
}
