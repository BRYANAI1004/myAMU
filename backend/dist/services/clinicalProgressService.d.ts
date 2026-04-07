import type { Pool } from "mysql2/promise";
import type { ClinicalProgress } from "../types/studentAccount.js";
/**
 * Two queries total: clinic rows for all ids, then required hours per student.
 * Same rules as {@link buildClinicalProgress}; map keys are trimmed student ids.
 */
export declare function batchBuildClinicalProgressForStudentIds(pool: Pool, studentIds: string[]): Promise<Map<string, ClinicalProgress>>;
/**
 * Legacy clinical progress from `clinic`, `students`, and `requirements` (real students only).
 */
export declare function buildClinicalProgress(pool: Pool, studentId: string): Promise<ClinicalProgress>;
//# sourceMappingURL=clinicalProgressService.d.ts.map