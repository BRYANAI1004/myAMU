import type { Pool } from "mysql2/promise";
export type CourseFeedbackDbRow = {
    id: number;
    student_id: string;
    course_code: string;
    term: string;
    year: number;
    rating: number;
    workload_rating: number;
    difficulty_rating: number;
    comments: string | null;
    submitted_at: Date;
};
export declare function listCourseFeedbackForStudent(pool: Pool, studentId: string): Promise<CourseFeedbackDbRow[]>;
export declare function findCourseFeedbackDuplicate(pool: Pool, args: {
    studentId: string;
    courseCode: string;
    term: string;
    year: number;
}): Promise<boolean>;
export type InsertCourseFeedbackInput = {
    studentId: string;
    courseCode: string;
    term: string;
    year: number;
    rating: number;
    workloadRating: number;
    difficultyRating: number;
    comments: string | null;
};
export declare function insertCourseFeedback(pool: Pool, input: InsertCourseFeedbackInput): Promise<number>;
//# sourceMappingURL=studentCourseFeedbackRepository.d.ts.map