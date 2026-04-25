import type { Pool, RowDataPacket } from "mysql2/promise";

export type AdminUserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: string;
};

/**
 * Lookup by canonical email (identifier normalized to lowercase trim).
 */
export async function findAdminUserByEmail(
  pool: Pool,
  emailNormalized: string,
): Promise<AdminUserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, email, password_hash, role
     FROM admin_users
     WHERE LOWER(TRIM(email)) = ?
     LIMIT 1`,
    [emailNormalized],
  );
  const row = rows[0] as RowDataPacket | undefined;
  if (row == null) return null;
  return {
    id: Number(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
    role: String(row.role),
  };
}
