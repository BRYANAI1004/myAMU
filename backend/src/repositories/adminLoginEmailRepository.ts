import { pool, type RowDataPacket } from "../lib/db.js";

export type AdminLoginEmailRow = {
  adminEmail: string;
  email: string;
  verifiedAt: string;
  updatedAt: string;
};

export type AdminOtpChallengeRow = {
  id: number;
  adminEmail: string;
  email: string;
  codeHash: string;
  purpose: string;
  expiresAt: string;
  attempts: number;
  consumedAt: string | null;
  createdAt: string;
};

function ts(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) return v;
  return new Date(0).toISOString();
}

function mapLoginEmailRow(row: RowDataPacket): AdminLoginEmailRow {
  return {
    adminEmail: String(row.admin_email ?? ""),
    email: String(row.email ?? ""),
    verifiedAt: ts(row.verified_at),
    updatedAt: ts(row.updated_at),
  };
}

function mapChallengeRow(row: RowDataPacket): AdminOtpChallengeRow {
  return {
    id: Number(row.id),
    adminEmail: String(row.admin_email ?? ""),
    email: String(row.email ?? ""),
    codeHash: String(row.code_hash ?? ""),
    purpose: String(row.purpose ?? ""),
    expiresAt: ts(row.expires_at),
    attempts: Number(row.attempts ?? 0),
    consumedAt: row.consumed_at == null ? null : ts(row.consumed_at),
    createdAt: ts(row.created_at),
  };
}

export async function findAdminLoginEmailByAccountEmail(
  adminEmail: string,
): Promise<AdminLoginEmailRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT admin_email, email, verified_at, updated_at
     FROM admin_login_emails
     WHERE LOWER(admin_email) = ?
     LIMIT 1`,
    [adminEmail.trim().toLowerCase()],
  );
  const row = rows[0];
  return row ? mapLoginEmailRow(row) : null;
}

export async function findAdminLoginEmailOwnerAccountEmail(
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT admin_email
     FROM admin_login_emails
     WHERE LOWER(email) = ?
     LIMIT 1`,
    [normalized],
  );
  const row = rows[0];
  return row ? String(row.admin_email ?? "").trim().toLowerCase() : null;
}

export async function upsertVerifiedAdminLoginEmail(
  adminEmail: string,
  email: string,
): Promise<AdminLoginEmailRow> {
  const account = adminEmail.trim().toLowerCase();
  const normalized = email.trim().toLowerCase();
  await pool.query(
    `INSERT INTO admin_login_emails (admin_email, email, verified_at, updated_at)
     VALUES (?, ?, NOW(), NOW())
     ON CONFLICT (admin_email)
     DO UPDATE SET
       email = EXCLUDED.email,
       verified_at = NOW(),
       updated_at = NOW()`,
    [account, normalized],
  );
  const row = await findAdminLoginEmailByAccountEmail(account);
  if (row == null) {
    throw new Error("Failed to persist verified admin login email.");
  }
  return row;
}

export async function insertAdminOtpChallenge(input: {
  adminEmail: string;
  email: string;
  codeHash: string;
  purpose: string;
  expiresAt: Date;
}): Promise<AdminOtpChallengeRow> {
  const [result] = await pool.query<{ insertId: number }>(
    `INSERT INTO admin_email_otp_challenges (
       admin_email, email, code_hash, purpose, expires_at
     ) VALUES (?, ?, ?, ?, ?)`,
    [
      input.adminEmail.trim().toLowerCase(),
      input.email.trim().toLowerCase(),
      input.codeHash,
      input.purpose,
      input.expiresAt,
    ],
  );
  const insertId = Number(result?.insertId ?? 0);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new Error("Failed to create admin OTP challenge.");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, admin_email, email, code_hash, purpose, expires_at, attempts, consumed_at, created_at
     FROM admin_email_otp_challenges
     WHERE id = ?
     LIMIT 1`,
    [insertId],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create admin OTP challenge.");
  return mapChallengeRow(row);
}

export async function consumeOutstandingAdminOtpChallenges(input: {
  adminEmail: string;
  purpose: string;
  exceptId?: number;
}): Promise<void> {
  if (input.exceptId != null) {
    await pool.query(
      `UPDATE admin_email_otp_challenges
       SET consumed_at = NOW()
       WHERE admin_email = ?
         AND purpose = ?
         AND consumed_at IS NULL
         AND id <> ?`,
      [input.adminEmail.trim().toLowerCase(), input.purpose, input.exceptId],
    );
    return;
  }
  await pool.query(
    `UPDATE admin_email_otp_challenges
     SET consumed_at = NOW()
     WHERE admin_email = ?
       AND purpose = ?
       AND consumed_at IS NULL`,
    [input.adminEmail.trim().toLowerCase(), input.purpose],
  );
}

export async function updateAdminOtpChallengeHash(
  id: number,
  codeHash: string,
): Promise<void> {
  await pool.query(
    `UPDATE admin_email_otp_challenges SET code_hash = ? WHERE id = ?`,
    [codeHash, id],
  );
}

export async function findLatestActiveAdminOtpChallenge(input: {
  adminEmail: string;
  email: string;
  purpose: string;
}): Promise<AdminOtpChallengeRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, admin_email, email, code_hash, purpose, expires_at, attempts, consumed_at, created_at
     FROM admin_email_otp_challenges
     WHERE admin_email = ?
       AND LOWER(email) = ?
       AND purpose = ?
       AND consumed_at IS NULL
       AND expires_at > NOW()
       AND code_hash <> 'pending'
     ORDER BY id DESC
     LIMIT 1`,
    [input.adminEmail.trim().toLowerCase(), input.email.trim().toLowerCase(), input.purpose],
  );
  const row = rows[0];
  return row ? mapChallengeRow(row) : null;
}

export async function incrementAdminOtpChallengeAttempts(id: number): Promise<void> {
  await pool.query(
    `UPDATE admin_email_otp_challenges
     SET attempts = attempts + 1
     WHERE id = ?`,
    [id],
  );
}

export async function consumeAdminOtpChallenge(id: number): Promise<void> {
  await pool.query(
    `UPDATE admin_email_otp_challenges
     SET consumed_at = NOW()
     WHERE id = ?`,
    [id],
  );
}

export async function countRecentAdminOtpSends(
  adminEmail: string,
  windowMinutes: number,
  purpose: string,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*)::int AS cnt
     FROM admin_email_otp_challenges
     WHERE admin_email = ?
       AND purpose = ?
       AND created_at > ?`,
    [adminEmail.trim().toLowerCase(), purpose, since],
  );
  return Number(rows[0]?.cnt ?? 0);
}
