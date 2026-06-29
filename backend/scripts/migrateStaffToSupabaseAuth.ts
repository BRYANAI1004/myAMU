#!/usr/bin/env npx tsx
/**
 * Wipe legacy admin accounts and seed the new staff roster in MySQL + Supabase Auth.
 *
 * Requires: DB_*, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import {
  deleteNonStudentSupabaseAuthUsers,
} from "../src/lib/supabaseAuthCommon.js";
import {
  STAFF_SEED_ROWS,
  upsertStaffSupabaseAuthUser,
  supabaseStaffAuthEnabled,
} from "../src/lib/staffSupabaseAuth.js";

async function ensureAdminUsersColumns(pool: mysql.Pool): Promise<void> {
  const [usernameCol] = await pool.query<mysql.RowDataPacket[]>(
    `SHOW COLUMNS FROM admin_users LIKE 'username'`,
  );
  if (usernameCol.length === 0) {
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

async function resetAdminUsers(pool: mysql.Pool): Promise<void> {
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
}

async function main(): Promise<void> {
  if (!supabaseStaffAuthEnabled()) {
    throw new Error(
      "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY before running.",
    );
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? "school",
    connectionLimit: 3,
  });

  try {
    console.log("Ensuring admin_users columns…");
    await ensureAdminUsersColumns(pool);

    console.log("Removing non-student Supabase Auth users…");
    const deleted = await deleteNonStudentSupabaseAuthUsers();
    console.log(`Deleted ${deleted} non-student auth user(s).`);

    console.log("Resetting admin_users in MySQL…");
    await resetAdminUsers(pool);
    console.log(`Inserted ${STAFF_SEED_ROWS.length} admin_users row(s).`);

    console.log("Creating staff Supabase Auth users…");
    for (const row of STAFF_SEED_ROWS) {
      await upsertStaffSupabaseAuthUser(row);
      console.log(`  ✓ ${row.username} (${row.email}) [${row.role}]`);
    }

    console.log("Staff migration complete.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
