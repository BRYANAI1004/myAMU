import { insertAdminEmailLogAttachment } from "../repositories/adminEmailLogAttachmentRepository.js";
import {
  insertAdminEmailLog,
  type AdminEmailLogDeliveryMode,
  type AdminEmailLogKind,
  type InsertAdminEmailLogInput,
} from "../repositories/adminEmailLogRepository.js";
import { uploadAdminEmailLogAttachment } from "./adminEmailLogStorageService.js";

export type RecordAdminEmailLogInput = InsertAdminEmailLogInput;

export type RecordAdminEmailLogAttachment = {
  filename: string;
  content: Buffer;
};

export async function recordAdminEmailLog(
  input: RecordAdminEmailLogInput,
  fileAttachments: RecordAdminEmailLogAttachment[] = [],
): Promise<number | null> {
  try {
    const logId = await insertAdminEmailLog(input);
    if (logId == null) return null;

    for (const file of fileAttachments) {
      const filename = file.filename.trim();
      if (filename === "" || file.content.length === 0) continue;
      try {
        const uploaded = await uploadAdminEmailLogAttachment({
          logId,
          filename,
          fileBuffer: file.content,
        });
        await insertAdminEmailLogAttachment({
          logId,
          filename,
          contentType: uploaded.contentType,
          storagePath: uploaded.storagePath,
          byteSize: uploaded.byteSize,
        });
      } catch (e) {
        console.error(
          `[admin/email-logs] failed to store attachment "${filename}" for log ${logId}`,
          e,
        );
      }
    }

    return logId;
  } catch (e) {
    console.error("[admin/email-logs] failed to record log entry", e);
    return null;
  }
}

export function adminEmailLogKindLabel(kind: AdminEmailLogKind): string {
  return kind === "mass_email" ? "Mass email" : "Bulk email";
}

export function adminEmailLogDeliveryModeLabel(
  mode: AdminEmailLogDeliveryMode,
): string {
  return mode === "to" ? "To" : "BCC";
}
