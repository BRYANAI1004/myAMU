import type { Pool } from "mysql2/promise";
/**
 * Resolves `students.id` (portal / finance canonical external id) from either
 * `students.id` or `students.seqNum`.
 */
export declare function resolveCanonicalStudentExternalId(pool: Pool, rawStudentKey: string): Promise<string | null>;
//# sourceMappingURL=studentIdentityRepository.d.ts.map