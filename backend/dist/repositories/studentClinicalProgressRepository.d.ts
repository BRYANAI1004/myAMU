/**
 * Student-facing clinical completion rows from legacy `clinic` only (grade P, raw hours),
 * plus fixed clinical exam history from the same `clinic` table.
 */
import type { Pool } from "mysql2/promise";
export type StudentClinicalProgressRecord = {
    code: string;
    courseTitle: string;
    term: string;
    year: number;
    grade: string;
    hours: number;
};
export type StudentClinicalExamHistoryItem = {
    code: string;
    examName: string;
    status: "Not Taken" | "Pending Grade" | "Completed";
    grade: string | null;
    term: string | null;
    year: number | null;
};
/**
 * Lists passed clinical rows and a summary from `clinic` (source of truth for this endpoint).
 */
export declare function loadStudentClinicalProgressFromClinic(pool: Pool, studentId: string): Promise<{
    completedCount: number;
    totalHours: number;
    records: StudentClinicalProgressRecord[];
    exams: StudentClinicalExamHistoryItem[];
}>;
//# sourceMappingURL=studentClinicalProgressRepository.d.ts.map