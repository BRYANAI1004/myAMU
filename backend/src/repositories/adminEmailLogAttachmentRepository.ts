import { pool, type RowDataPacket } from "../lib/db.js";

export type AdminEmailLogAttachmentRow = {
  id: number;
  logId: number;
  filename: string;
  contentType: string | null;
  storagePath: string;
  byteSize: number;
  createdAt: string;
};

function ts(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) return v;
  return new Date(0).toISOString();
}

function mapRow(row: RowDataPacket): AdminEmailLogAttachmentRow {
  return {
    id: Number(row.id),
    logId: Number(row.log_id),
    filename: String(row.filename ?? ""),
    contentType: row.content_type == null ? null : String(row.content_type),
    storagePath: String(row.storage_path ?? ""),
    byteSize: Number(row.byte_size ?? 0),
    createdAt: ts(row.created_at),
  };
}

export async function insertAdminEmailLogAttachment(input: {
  logId: number;
  filename: string;
  contentType: string | null;
  storagePath: string;
  byteSize: number;
}): Promise<number | null> {
  const [result] = await pool.query<RowDataPacket[]>(
    `INSERT INTO admin_email_log_attachments (
       log_id, filename, content_type, storage_path, byte_size
     ) VALUES (?, ?, ?, ?, ?)
     RETURNING id`,
    [
      input.logId,
      input.filename.trim().slice(0, 255),
      input.contentType,
      input.storagePath.trim(),
      Math.max(0, Math.trunc(input.byteSize)),
    ],
  );
  const row = result[0];
  if (row == null) return null;
  const id = Number(row.id);
  return Number.isFinite(id) ? id : null;
}

export async function listAdminEmailLogAttachmentsByLogIds(
  logIds: number[],
): Promise<Map<number, AdminEmailLogAttachmentRow[]>> {
  const out = new Map<number, AdminEmailLogAttachmentRow[]>();
  if (logIds.length === 0) return out;

  const placeholders = logIds.map(() => "?").join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, log_id, filename, content_type, storage_path, byte_size, created_at
     FROM admin_email_log_attachments
     WHERE log_id IN (${placeholders})
     ORDER BY log_id ASC, id ASC`,
    logIds,
  );

  for (const row of rows) {
    const mapped = mapRow(row);
    const list = out.get(mapped.logId) ?? [];
    list.push(mapped);
    out.set(mapped.logId, list);
  }
  return out;
}

export async function findAdminEmailLogAttachment(
  logId: number,
  attachmentId: number,
): Promise<AdminEmailLogAttachmentRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, log_id, filename, content_type, storage_path, byte_size, created_at
     FROM admin_email_log_attachments
     WHERE log_id = ? AND id = ?
     LIMIT 1`,
    [logId, attachmentId],
  );
  const row = rows[0];
  return row == null ? null : mapRow(row);
}
