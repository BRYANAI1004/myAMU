/**
 * Smoke-test R2 presigned PUT URL generation without starting Express.
 *
 * Usage (from backend/):
 *   npm run test:student-image
 *   npm run test:student-image -- AMU123456
 *   npm run test:student-image -- AMU123456 avatar.jpg
 *
 * Requires in .env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  createStudentAvatarDirectUploadUrl,
  StudentImageServiceError,
} from "../src/services/studentImageService.js";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

const studentId = process.argv[2]?.trim() || "test-student-local";
const fileNameArg = process.argv[3]?.trim();
const input =
  fileNameArg !== undefined && fileNameArg !== ""
    ? { studentId, fileName: fileNameArg }
    : { studentId };

try {
  const result = await createStudentAvatarDirectUploadUrl(input);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  if (e instanceof StudentImageServiceError) {
    console.error("StudentImageServiceError:", e.message);
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
}
