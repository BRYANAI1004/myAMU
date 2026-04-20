import type { Pool } from "mysql2/promise";
export type LegacyStudentRow = {
    id: string;
    name: string;
};
/**
 * Legacy `students` table: `id` matches portal registration id (e.g. C17310).
 */
export declare function findLegacyStudentById(pool: Pool, studentId: string): Promise<LegacyStudentRow | null>;
/**
 * Stored `password` from legacy `password_stu` (MD5 hex, 32 chars; login rejects non-hex rows).
 */
export declare function findLegacyStudentPasswordStored(pool: Pool, studentId: string): Promise<string | null>;
//# sourceMappingURL=studentLegacyAuthRepository.d.ts.map