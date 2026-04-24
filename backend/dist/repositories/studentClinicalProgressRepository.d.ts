/**
 * Clinical progress rows for student/admin clinical progress tabs.
 * Source of truth is `clinical_assignments`; exam history merges requests + legacy signals.
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
 * Clinical progress for student/admin tabs using `clinical_assignments` as the primary source.
 */
export declare function loadStudentClinicalProgressFromClinic(pool: Pool, studentRouteParam: string): Promise<{
    completedCount: number;
    totalHours: number;
    records: StudentClinicalProgressRecord[];
    exams: StudentClinicalExamHistoryItem[];
}>;
//# sourceMappingURL=studentClinicalProgressRepository.d.ts.map