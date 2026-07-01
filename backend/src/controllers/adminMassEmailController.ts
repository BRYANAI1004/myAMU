import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { pool } from "../lib/db.js";
import { findAdminLoginEmailByAccountEmail } from "../repositories/adminLoginEmailRepository.js";
import { findAdminUserByIdentifier } from "../repositories/adminUserRepository.js";
import {
  sendEmail,
  type EmailAttachment,
  type SendEmailResult,
} from "../services/emailService.js";
import { recordAdminEmailLog } from "../services/adminEmailLogService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_MAX = 200;
const BODY_MAX = 50_000;
const MAX_ATTACHMENTS = 5;

type MassEmailBody = {
  recipients?: unknown;
  subject?: unknown;
  body?: unknown;
  attachments?: unknown;
};

function dedupe(addresses: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of addresses) {
    const trimmed = raw.trim();
    if (trimmed === "") continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function parseMassEmailBodyCore(
  raw: unknown,
): { ok: true; value: { recipients: string[]; subject: string; body: string } } | { ok: false; error: string } {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, error: "JSON body required." };
  }
  const o = raw as MassEmailBody;

  if (!Array.isArray(o.recipients)) {
    return { ok: false, error: "recipients must be an array of email addresses." };
  }
  for (const v of o.recipients) {
    if (typeof v !== "string") {
      return { ok: false, error: "recipients must be an array of strings." };
    }
  }
  const recipients = dedupe(o.recipients as string[]);
  if (recipients.length === 0) {
    return { ok: false, error: "At least one recipient is required." };
  }
  for (const r of recipients) {
    if (!EMAIL_REGEX.test(r)) {
      return { ok: false, error: `Invalid email address: ${r}` };
    }
  }
  if (recipients.length > env.smtp.bulkRecipientLimit) {
    return {
      ok: false,
      error: `Too many recipients (${recipients.length}). Maximum per send is ${env.smtp.bulkRecipientLimit}.`,
    };
  }

  if (typeof o.subject !== "string") {
    return { ok: false, error: "subject is required." };
  }
  const subject = o.subject.trim();
  if (subject === "") {
    return { ok: false, error: "subject is required." };
  }
  if (subject.length > SUBJECT_MAX) {
    return { ok: false, error: `subject must be ${SUBJECT_MAX} characters or fewer.` };
  }

  if (typeof o.body !== "string") {
    return { ok: false, error: "body is required." };
  }
  const body = o.body;
  if (body.trim() === "") {
    return { ok: false, error: "body is required." };
  }
  if (body.length > BODY_MAX) {
    return { ok: false, error: `body must be ${BODY_MAX} characters or fewer.` };
  }

  return { ok: true, value: { recipients, subject, body } };
}

function parseMassEmailAttachments(
  raw: unknown,
): { ok: true; value: EmailAttachment[] } | { ok: false; error: string } {
  if (raw == null) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "attachments must be an array." };
  }
  if (raw.length > MAX_ATTACHMENTS) {
    return {
      ok: false,
      error: `Too many attachments (${raw.length}). Maximum is ${MAX_ATTACHMENTS}.`,
    };
  }

  const attachments: EmailAttachment[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (item == null || typeof item !== "object") {
      return { ok: false, error: `attachments[${i}] must be an object.` };
    }
    const row = item as { filename?: unknown; contentBase64?: unknown };

    if (typeof row.filename !== "string" || row.filename.trim() === "") {
      return { ok: false, error: `attachments[${i}].filename is required.` };
    }
    const filename = row.filename.trim().slice(0, 255);

    if (typeof row.contentBase64 !== "string" || row.contentBase64.trim() === "") {
      return { ok: false, error: `attachments[${i}].contentBase64 is required.` };
    }

    let content: Buffer;
    try {
      content = Buffer.from(row.contentBase64, "base64");
    } catch {
      return { ok: false, error: `attachments[${i}] has invalid base64 content.` };
    }
    if (content.length === 0) {
      return { ok: false, error: `attachments[${i}] is empty.` };
    }

    attachments.push({ filename, content });
  }

  return { ok: true, value: attachments };
}

function parseMassEmailBody(
  raw: unknown,
):
  | {
      ok: true;
      value: {
        recipients: string[];
        subject: string;
        body: string;
        attachments: EmailAttachment[];
      };
    }
  | { ok: false; error: string } {
  const base = parseMassEmailBodyCore(raw);
  if (!base.ok) return base;

  const o = raw as MassEmailBody;
  const attachmentsParsed = parseMassEmailAttachments(o.attachments);
  if (!attachmentsParsed.ok) return attachmentsParsed;

  return {
    ok: true,
    value: { ...base.value, attachments: attachmentsParsed.value },
  };
}

/** POST /api/admin/mass-email/send — BCC students using the admin's verified login email as From. */
export async function postAdminMassEmail(
  req: Request,
  res: Response,
): Promise<void> {
  const adminAccountEmail = req.adminUser?.email?.trim().toLowerCase() ?? "";
  if (adminAccountEmail === "") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const verified = await findAdminLoginEmailByAccountEmail(adminAccountEmail);
  if (verified == null) {
    res.status(403).json({
      error:
        "Verify your login email in Setting before sending mass email.",
    });
    return;
  }

  const parsed = parseMassEmailBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const adminRow = await findAdminUserByIdentifier(pool, adminAccountEmail);
  const fromName =
    adminRow?.display_name?.trim() ||
    adminRow?.username?.trim() ||
    "Alhambra Medical University";
  const fromAddress = verified.email.trim().toLowerCase();

  const { recipients, subject, body, attachments } = parsed.value;
  const attachmentNames = attachments
    .map((a) => a.filename?.trim())
    .filter((name): name is string => typeof name === "string" && name !== "");
  const fileAttachments = attachments
    .map((attachment) => {
      const filename = attachment.filename?.trim() ?? "";
      if (filename === "") return null;
      const content =
        attachment.content instanceof Buffer
          ? attachment.content
          : typeof attachment.content === "string"
            ? Buffer.from(attachment.content)
            : null;
      if (content == null || content.length === 0) return null;
      return { filename, content };
    })
    .filter((item): item is { filename: string; content: Buffer } => item != null);

  let result: SendEmailResult;
  try {
    result = await sendEmail({
      bcc: recipients,
      replyTo: fromAddress,
      subject,
      text: body,
      fromAddress,
      fromName,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  } catch (e) {
    console.error("[admin/mass-email] send failed", e);
    const message =
      e instanceof Error ? e.message : "Mail provider rejected the message.";
    await recordAdminEmailLog(
      {
        kind: "mass_email",
        sentByAdminEmail: adminAccountEmail,
        sentByDisplayName: adminRow?.display_name?.trim() || adminRow?.username?.trim() || null,
        fromAddress,
        subject,
        recipientCount: recipients.length,
        deliveryMode: "bcc",
        delivered: false,
        messageId: null,
        smtpProfileId: null,
        attachmentCount: attachmentNames.length,
        attachmentNames,
        note: message,
      },
      fileAttachments,
    );
    res.status(502).json({ error: `Email send failed: ${message}` });
    return;
  }

  await recordAdminEmailLog(
    {
      kind: "mass_email",
      sentByAdminEmail: adminAccountEmail,
      sentByDisplayName: adminRow?.display_name?.trim() || adminRow?.username?.trim() || null,
      fromAddress,
      subject,
      recipientCount: recipients.length,
      deliveryMode: "bcc",
      delivered: result.delivered,
      messageId: result.messageId,
      smtpProfileId: result.profileId,
      attachmentCount: attachmentNames.length,
      attachmentNames,
      note: result.note ?? null,
    },
    fileAttachments,
  );

  res.json({
    delivered: result.delivered,
    messageId: result.messageId,
    profileId: result.profileId,
    recipientCount: recipients.length,
    fromAddress,
    note: result.note ?? null,
  });
}
