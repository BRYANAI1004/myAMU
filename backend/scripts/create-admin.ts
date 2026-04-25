/**
 * Upserts legacy admin portal accounts into `admin_users` with bcrypt password hashes.
 * Run after migration `015_admin_users.sql`. Usage (from backend/): `npm run admin:create`
 */
import bcrypt from "bcrypt";
import { closePool, pool, testDatabaseConnection } from "../src/lib/db.js";

type SeedRow = { email: string; password: string; role: string };

const SEED_ROWS: readonly SeedRow[] = [
  { email: "deanjiang@amu", password: "deanjiang123", role: "super_admin" },
  { email: "wanpanelami@gmail.com", password: "amuadmin123", role: "admin" },
  { email: "bingchen.li@wanpanel.ai", password: "amuadmin123", role: "admin" },
  { email: "clinic@amu.edu", password: "amuadmin123", role: "admin" },
  { email: "clinicdean@amu.edu", password: "amuadmin123", role: "admin" },
  { email: "teacher@amu.edu", password: "teacher123", role: "teacher" },
  { email: "clinical@amu.edu", password: "clinical123", role: "clinical_teacher" },
  { email: "clinicaladmin@amu", password: "clinicaladmin", role: "clinical_admin" },
] as const;

async function main(): Promise<void> {
  await testDatabaseConnection();
  for (const row of SEED_ROWS) {
    const passwordHash = await bcrypt.hash(row.password, 10);
    await pool.execute(
      `INSERT INTO admin_users (email, password_hash, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         role = VALUES(role)`,
      [row.email, passwordHash, row.role],
    );
  }
  console.log(`[admin:create] Upserted ${SEED_ROWS.length} admin_users row(s).`);
  await closePool();
}

main().catch((e: unknown) => {
  console.error("[admin:create] failed:", e);
  process.exit(1);
});
