import type { Pool } from "mysql2/promise";
export type MarksRow = {
    name: string;
    code: string;
    course_title: string;
    days: string | null;
    time_from: unknown;
    time_to: unknown;
    instructor: string;
    term: string;
    year: number;
    grade: string;
    grade2: unknown;
};
/**
 * All `marks` rows for the student, newest term/year first (then course code).
 */
export declare function listMarksForStudent(pool: Pool, studentId: string): Promise<MarksRow[]>;
//# sourceMappingURL=studentAcademicsRepository.d.ts.map