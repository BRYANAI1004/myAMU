import type { Request, Response } from "express";
import { env } from "../config/env.js";
import {
  listSmtpProfilesPublic,
  sendEmail,
  type SendEmailResult,
} from "../services/emailService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_MAX = 200;
const BODY_MAX = 50_000;

type BulkEmailBody = {
  recipients?: unknown;
  subject?: unknown;
  body?: unknown;
  replyTo?: unknown;
  /** "bcc" (default, recommended) or "to". */
  recipientField?: unknown;
  /** Sender profile id (must match an entry returned by `/api/admin/email/profiles`). */
  profileId?: unknown;
};

type ParsedBulkEmail = {
  recipients: string[];
  subject: string;
  body: string;
  replyTo: string | null;
  recipientField: "bcc" | "to";
  profileId: string | null;
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

function parseBulkEmailBody(
  raw: unknown,
): { ok: true; value: ParsedBulkEmail } | { ok: false; error: string } {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, error: "JSON body required." };
  }
  const o = raw as BulkEmailBody;

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

  let replyTo: string | null = null;
  if (o.replyTo != null) {
    if (typeof o.replyTo !== "string") {
      return { ok: false, error: "replyTo must be a string." };
    }
    const t = o.replyTo.trim();
    if (t !== "") {
      if (!EMAIL_REGEX.test(t)) {
        return { ok: false, error: `replyTo is not a valid email address: ${t}` };
      }
      replyTo = t;
    }
  }

  let recipientField: "bcc" | "to" = "bcc";
  if (o.recipientField != null) {
    if (o.recipientField !== "bcc" && o.recipientField !== "to") {
      return { ok: false, error: "recipientField must be \"bcc\" or \"to\"." };
    }
    recipientField = o.recipientField;
  }

  let profileId: string | null = null;
  if (o.profileId != null) {
    if (typeof o.profileId !== "string") {
      return { ok: false, error: "profileId must be a string." };
    }
    const t = o.profileId.trim().toLowerCase();
    if (t !== "") {
      if (!/^[a-z0-9_-]+$/.test(t)) {
        return { ok: false, error: "profileId may only contain letters, digits, underscore, and hyphen." };
      }
      profileId = t;
    }
  }

  return {
    ok: true,
    value: { recipients, subject, body, replyTo, recipientField, profileId },
  };
}

/** GET /api/admin/email/profiles — list available sender profiles (no credentials). */
export async function getAdminEmailProfiles(
  _req: Request,
  res: Response,
): Promise<void> {
  res.json({
    profiles: listSmtpProfilesPublic(),
    recipientLimit: env.smtp.bulkRecipientLimit,
  });
}

/** POST /api/admin/email/bulk — send a single message addressed to many students. */
export async function postAdminBulkEmail(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = parseBulkEmailBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { recipients, subject, body, replyTo, recipientField, profileId } =
    parsed.value;

  let result: SendEmailResult;
  try {
    result = await sendEmail({
      to: recipientField === "to" ? recipients : undefined,
      bcc: recipientField === "bcc" ? recipients : undefined,
      replyTo,
      subject,
      text: body,
      profileId,
    });
  } catch (e) {
    console.error("[admin/email/bulk] send failed", e);
    const message =
      e instanceof Error ? e.message : "Mail provider rejected the message.";
    res.status(502).json({ error: `Email send failed: ${message}` });
    return;
  }

  res.json({
    delivered: result.delivered,
    messageId: result.messageId,
    profileId: result.profileId,
    recipientCount: recipients.length,
    note: result.note ?? null,
  });
}
