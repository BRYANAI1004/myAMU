/**
 * Applies `migrations/009_portal_student_avatar_object_key.sql` using `backend/.env`.
 * Run from repo: `cd backend && npm run db:apply-009`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

async function main(): Promise<void> {
  const sqlPath = path.join(
    backendRoot,
    "migrations",
    "009_portal_student_avatar_object_key.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const database = process.env.DB_NAME?.trim();
  if (!host || !user || !database) {
    throw new Error("DB_HOST, DB_USER, and DB_NAME must be set in backend/.env");
  }
  const conn = await mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT ?? 3306),
    user,
    password: process.env.DB_PASSWORD ?? "",
    database,
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
    console.log(
      "[db:apply-009] OK — portal_students + avatar_object_key are ready in database:",
      database,
    );
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[db:apply-009] FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
