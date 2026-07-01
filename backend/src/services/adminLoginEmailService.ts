import crypto from "node:crypto";
import {
  maskLoginEmail,
  normalizeLoginEmail,
  toLoginEmailStatus,
  type StudentLoginEmailStatus,
} from "../lib/studentLoginEmailUtils.js";
import {
  consumeAdminOtpChallenge,
  consumeOutstandingAdminOtpChallenges,
  countRecentAdminOtpSends,
  findAdminLoginEmailByAccountEmail,
  findAdminLoginEmailOwnerAccountEmail,
  findLatestActiveAdminOtpChallenge,
  incrementAdminOtpChallengeAttempts,
  insertAdminOtpChallenge,
  updateAdminOtpChallengeHash,
  upsertVerifiedAdminLoginEmail,
} from "../repositories/adminLoginEmailRepository.js";
import { EMAIL_LOGO_IMG_TAG, emailLogoAttachment } from "../lib/emailBranding.js";
import { sendEmail } from "./emailService.js";

const OTP_PURPOSE_VERIFY = "verify";
const OTP_EXPIRY_MINUTES = 10;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MINUTES = 15;
const MAX_VERIFY_ATTEMPTS = 5;

function otpPepper(): string {
  return (
    process.env.ADMIN_AUTH_SECRET?.trim() ||
    process.env.ADMIN_LOGIN_EMAIL_OTP_SECRET?.trim() ||
    "dev-only-admin-login-email-otp-pepper"
  );
}

function hashOtpCode(code: string, challengeId: number, adminEmail: string): string {
  return crypto
    .createHash("sha256")
    .update(`${code}:${challengeId}:${adminEmail}:${otpPepper()}`)
    .digest("hex");
}

function generateOtpCode(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}

function buildOtpEmailBodies(code: string): { text: string; html: string } {
  const text = [
    "Your myAMU administrator verification code",
    "",
    code,
    "",
    "This code expires in 10 minutes.",
    "If you did not request this, you can ignore this email.",
    "",
    "Alhambra Medical University",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:system-ui,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px 24px;">
    <tr>
      <td align="center" style="padding-bottom:24px;">
        ${EMAIL_LOGO_IMG_TAG}
      </td>
    </tr>
    <tr>
      <td style="font-size:18px;font-weight:600;padding-bottom:8px;">Your verification code</td>
    </tr>
    <tr>
      <td style="font-size:15px;line-height:1.5;padding-bottom:24px;color:#444;">
        Enter this code in Setting to verify your login email for the administrator portal.
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom:24px;">
        <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:6px;padding:12px 20px;background:#f0f0f0;border-radius:8px;">${code}</span>
      </td>
    </tr>
    <tr>
      <td style="font-size:13px;line-height:1.5;color:#666;">
        This code expires in 10 minutes. If you did not request this, you can ignore this email.
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html };
}

export class AdminLoginEmailError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminLoginEmailError";
    this.status = status;
  }
}

function isMissingTableError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "42P01";
}

export async function getAdminLoginEmailStatus(
  adminEmail: string,
): Promise<StudentLoginEmailStatus> {
  try {
    const row = await findAdminLoginEmailByAccountEmail(adminEmail);
    return toLoginEmailStatus(
      row ? { email: row.email, verifiedAt: row.verifiedAt } : null,
    );
  } catch (err) {
    if (isMissingTableError(err)) {
      throw new AdminLoginEmailError(
        "Login email is not available until the admin_login_email migration is applied.",
        503,
      );
    }
    throw err;
  }
}

export async function sendAdminLoginEmailCode(
  adminEmail: string,
  emailRaw: string,
): Promise<{ expiresInSeconds: number }> {
  const email = normalizeLoginEmail(emailRaw);
  if (email == null) {
    throw new AdminLoginEmailError("Enter a valid email address.", 400);
  }

  const account = adminEmail.trim().toLowerCase();
  const owner = await findAdminLoginEmailOwnerAccountEmail(email);
  if (owner != null && owner !== account) {
    throw new AdminLoginEmailError(
      "This email is already linked to another administrator account.",
      409,
    );
  }

  const recentSends = await countRecentAdminOtpSends(
    account,
    SEND_WINDOW_MINUTES,
    OTP_PURPOSE_VERIFY,
  );
  if (recentSends >= MAX_SENDS_PER_WINDOW) {
    throw new AdminLoginEmailError(
      "Too many codes sent. Please wait a few minutes and try again.",
      429,
    );
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const challenge = await insertAdminOtpChallenge({
    adminEmail: account,
    email,
    codeHash: "pending",
    purpose: OTP_PURPOSE_VERIFY,
    expiresAt,
  });

  const codeHash = hashOtpCode(code, challenge.id, account);
  await updateAdminOtpChallengeHash(challenge.id, codeHash);
  await consumeOutstandingAdminOtpChallenges({
    adminEmail: account,
    purpose: OTP_PURPOSE_VERIFY,
    exceptId: challenge.id,
  });

  const bodies = buildOtpEmailBodies(code);
  const mail = await sendEmail({
    to: [email],
    subject: `${code} is your myAMU administrator verification code`,
    text: bodies.text,
    html: bodies.html,
    attachments: [emailLogoAttachment()],
  });

  if (!mail.delivered) {
    throw new AdminLoginEmailError(
      mail.note ?? "Unable to send verification email right now.",
      503,
    );
  }

  return { expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
}

export async function verifyAdminLoginEmailCode(
  adminEmail: string,
  emailRaw: string,
  codeRaw: string,
): Promise<StudentLoginEmailStatus> {
  const email = normalizeLoginEmail(emailRaw);
  if (email == null) {
    throw new AdminLoginEmailError("Enter a valid email address.", 400);
  }

  const code = codeRaw.trim().replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    throw new AdminLoginEmailError("Enter the 6-digit code from your email.", 400);
  }

  const account = adminEmail.trim().toLowerCase();
  const owner = await findAdminLoginEmailOwnerAccountEmail(email);
  if (owner != null && owner !== account) {
    throw new AdminLoginEmailError(
      "This email is already linked to another administrator account.",
      409,
    );
  }

  const existing = await findAdminLoginEmailByAccountEmail(account);
  if (existing != null && existing.email.toLowerCase() === email) {
    return {
      verified: true,
      emailMasked: maskLoginEmail(existing.email),
      verifiedAt: existing.verifiedAt,
    };
  }

  const challenge = await findLatestActiveAdminOtpChallenge({
    adminEmail: account,
    email,
    purpose: OTP_PURPOSE_VERIFY,
  });
  if (challenge == null) {
    throw new AdminLoginEmailError(
      "No active verification code. Send a new code and try again.",
      400,
    );
  }

  if (challenge.email.toLowerCase() !== email) {
    throw new AdminLoginEmailError(
      "This code was sent to a different email address. Send a new code for the email you entered.",
      400,
    );
  }

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new AdminLoginEmailError(
      "Too many incorrect attempts. Send a new code and try again.",
      429,
    );
  }

  const expected = hashOtpCode(code, challenge.id, account);
  if (expected !== challenge.codeHash) {
    await incrementAdminOtpChallengeAttempts(challenge.id);
    throw new AdminLoginEmailError("Incorrect code. Try again.", 400);
  }

  await consumeAdminOtpChallenge(challenge.id);
  const saved = await upsertVerifiedAdminLoginEmail(account, email);
  return {
    verified: true,
    emailMasked: maskLoginEmail(saved.email),
    verifiedAt: saved.verifiedAt,
  };
}
