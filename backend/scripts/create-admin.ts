/**
 * Upserts staff rows into `admin_users` (MySQL). Supabase Auth users are created by
 * `npm run auth:migrate-staff`. Legacy hardcoded admin accounts were removed.
 */
import bcrypt from "bcryptjs";
import { closePool, pool, testDatabaseConnection } from "../src/lib/db.js";
import { STAFF_SEED_ROWS } from "../src/lib/staffSupabaseAuth.js";

async function ensureAdminUsersColumns(): Promise<void> {
  const [rows] = await pool.query<Array<{ Field: string }>>(
    `SHOW COLUMNS FROM admin_users LIKE 'username'`,
  );
  if (rows.length === 0) {
    await pool.execute(
      `ALTER TABLE admin_users
         ADD COLUMN username varchar(64) NULL AFTER email,
         ADD COLUMN display_name varchar(255) NULL AFTER username`,
    );
    await pool.execute(
      `ALTER TABLE admin_users
         ADD UNIQUE KEY uq_admin_users_username (username)`,
    );
  }
}

async function main(): Promise<void> {
  await testDatabaseConnection();
  await ensureAdminUsersColumns();
  await pool.execute(`DELETE FROM admin_users`);
  for (const row of STAFF_SEED_ROWS) {
    const passwordHash = await bcrypt.hash(row.password, 10);
    await pool.execute(
      `INSERT INTO admin_users (email, username, display_name, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [
        row.email.trim().toLowerCase(),
        row.username.trim().toLowerCase(),
        row.displayName.trim(),
        passwordHash,
        row.role,
      ],
    );
  }
  console.log(`[admin:create] Seeded ${STAFF_SEED_ROWS.length} admin_users row(s).`);
  await closePool();
}

main().catch((e: unknown) => {
  console.error("[admin:create] failed:", e);
  process.exit(1);
});
