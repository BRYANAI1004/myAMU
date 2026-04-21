import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { env } from "../config/env.js";

/**
 * Only cache a positive result. If the column was missing at first check (false), we
 * re-query on later calls so a migration applied while the server stays up is picked up
 * without requiring a process restart.
 */
let portalStudentsAvatarObjectKeyKnownPresent = false;

export async function hasPortalStudentAvatarObjectKeyColumn(
  pool: Pool,
): Promise<boolean> {
  if (portalStudentsAvatarObjectKeyKnownPresent) return true;
  const schema = env.db.database;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'portal_students'
       AND COLUMN_NAME = 'avatar_object_key'
     LIMIT 1`,
    [schema],
  );
  const has = rows.length > 0;
  if (has) portalStudentsAvatarObjectKeyKnownPresent = true;
  return has;
}

export async function loadPortalStudentAvatarObjectKey(
  pool: Pool,
  studentExternalId: string,
): Promise<string | null> {
  if (!(await hasPortalStudentAvatarObjectKeyColumn(pool))) return null;
  const id = studentExternalId.trim();
  if (id === "") return null;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT TRIM(avatar_object_key) AS k
     FROM portal_students
     WHERE student_external_id = ?
     LIMIT 1`,
    [id],
  );
  const k = rows[0]?.k;
  return typeof k === "string" && k.length > 0 ? k : null;
}

/**
 * Sets R2 object key for the student’s avatar. Ensures a `portal_students` row exists
 * (full_name from legacy `students.name` when possible).
 */
export async function upsertPortalStudentAvatarObjectKey(
  pool: Pool,
  studentExternalId: string,
  objectKey: string,
): Promise<void> {
  if (!(await hasPortalStudentAvatarObjectKeyColumn(pool))) {
    throw new Error(
      "Database column portal_students.avatar_object_key is missing; apply migrations/009_portal_student_avatar_object_key.sql",
    );
  }
  const id = studentExternalId.trim();
  const key = objectKey.trim();
  if (id === "" || key === "") {
    throw new Error("student id and object key are required");
  }

  const [[legacy]] = await pool.query<RowDataPacket[]>(
    `SELECT TRIM(name) AS name FROM students WHERE id = ? LIMIT 1`,
    [id],
  );
  const fullName =
    legacy?.name != null && String(legacy.name).trim() !== ""
      ? String(legacy.name).trim()
      : id;

  await pool.query<ResultSetHeader>(
    `INSERT INTO portal_students (student_external_id, full_name, avatar_object_key)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE avatar_object_key = VALUES(avatar_object_key)`,
    [id, fullName, key],
  );
}
