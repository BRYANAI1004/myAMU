export type StudentAiIntent = "student_record" | "policy" | "mixed";
export type StudentRecordQuestionKind = "current_term_courses" | "current_term_course_count" | "current_term_credits" | "registered_term_count" | "registration_in_year" | "withdrawal_history" | "completed_course" | "completed_credits_total";
export type StudentRecordQuestionMatch = {
    kind: "current_term_courses";
} | {
    kind: "current_term_course_count";
} | {
    kind: "current_term_credits";
} | {
    kind: "registered_term_count";
} | {
    kind: "registration_in_year";
    year: number;
} | {
    kind: "withdrawal_history";
} | {
    kind: "completed_course";
    courseCode: string;
} | {
    kind: "completed_credits_total";
};
export declare function extractCourseCode(question: string): string | null;
export declare function detectStudentRecordQuestion(question: string): StudentRecordQuestionMatch | null;
export declare function classifyStudentAiIntent(question: string): StudentAiIntent;
//# sourceMappingURL=studentAiQuestionRouter.d.ts.map