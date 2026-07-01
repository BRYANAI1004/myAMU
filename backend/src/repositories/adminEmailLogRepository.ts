import { pool, type RowDataPacket } from "../lib/db.js";

export type AdminEmailLogKind = "mass_email" | "bulk_email";
export type AdminEmailLogDeliveryMode = "bcc" | "to";

export type AdminEmailLogRow = {
  id: number;
  kind: AdminEmailLogKind;
  sentByAdminEmail: string;
  sentByDisplayName: string | null;
  fromAddress: string;
  subject: string;
  recipientCount: number;
  deliveryMode: AdminEmailLogDeliveryMode;
  delivered: boolean;
  messageId: string | null;
  smtpProfileId: string | null;
  attachmentCount: number;
  attachmentNames: string[];
  note: string | null;
  createdAt: string;
};

export type InsertAdminEmailLogInput = {
  kind: AdminEmailLogKind;
  sentByAdminEmail: string;
  sentByDisplayName: string | null;
  fromAddress: string;
  subject: string;
  recipientCount: number;
  deliveryMode: AdminEmailLogDeliveryMode;
  delivered: boolean;
  messageId: string | null;
  smtpProfileId: string | null;
  attachmentCount: number;
  attachmentNames: string[];
  note: string | null;
};

function ts(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) return v;
  return new Date(0).toISOString();
}

function parseAttachmentNames(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (v): v is string => typeof v === "string" && v.trim() !== "",
        );
      }
    } catch {
      return [];
    }
  }
  return [];
}

function mapRow(row: RowDataPacket): AdminEmailLogRow {
  const kindRaw = String(row.kind ?? "");
  const deliveryRaw = String(row.delivery_mode ?? "bcc");
  return {
    id: Number(row.id),
    kind: kindRaw === "bulk_email" ? "bulk_email" : "mass_email",
    sentByAdminEmail: String(row.sent_by_admin_email ?? ""),
    sentByDisplayName:
      row.sent_by_display_name == null
        ? null
        : String(row.sent_by_display_name),
    fromAddress: String(row.from_address ?? ""),
    subject: String(row.subject ?? ""),
    recipientCount: Number(row.recipient_count ?? 0),
    deliveryMode: deliveryRaw === "to" ? "to" : "bcc",
    delivered: Boolean(row.delivered),
    messageId: row.message_id == null ? null : String(row.message_id),
    smtpProfileId:
      row.smtp_profile_id == null ? null : String(row.smtp_profile_id),
    attachmentCount: Number(row.attachment_count ?? 0),
    attachmentNames: parseAttachmentNames(row.attachment_names),
    note: row.note == null ? null : String(row.note),
    createdAt: ts(row.created_at),
  };
}

export async function insertAdminEmailLog(
  input: InsertAdminEmailLogInput,
): Promise<number | null> {
  const namesJson =
    input.attachmentNames.length > 0
      ? JSON.stringify(input.attachmentNames)
      : null;

  const [result] = await pool.query<RowDataPacket[]>(
    `INSERT INTO admin_email_logs (
       kind,
       sent_by_admin_email,
       sent_by_display_name,
       from_address,
       subject,
       recipient_count,
       delivery_mode,
       delivered,
       message_id,
       smtp_profile_id,
       attachment_count,
       attachment_names,
       note
     ) VALUES (
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?
     )
     RETURNING id`,
    [
      input.kind,
      input.sentByAdminEmail.trim().toLowerCase(),
      input.sentByDisplayName?.trim() || null,
      input.fromAddress.trim(),
      input.subject.trim().slice(0, 500),
      Math.max(0, Math.trunc(input.recipientCount)),
      input.deliveryMode,
      input.delivered,
      input.messageId,
      input.smtpProfileId,
      Math.max(0, Math.trunc(input.attachmentCount)),
      namesJson,
      input.note,
    ],
  );

  const row = result[0];
  if (row == null) return null;
  const id = Number(row.id);
  return Number.isFinite(id) ? id : null;
}

export async function listAdminEmailLogs(options: {
  page: number;
  pageSize: number;
}): Promise<{ items: AdminEmailLogRow[]; total: number }> {
  const page = Math.max(1, Math.trunc(options.page));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(options.pageSize)));
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*)::int AS total FROM admin_email_logs`,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       id,
       kind,
       sent_by_admin_email,
       sent_by_display_name,
       from_address,
       subject,
       recipient_count,
       delivery_mode,
       delivered,
       message_id,
       smtp_profile_id,
       attachment_count,
       attachment_names,
       note,
       created_at
     FROM admin_email_logs
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );

  return {
    items: rows.map(mapRow),
    total,
  };
}
