import { type CourseFeedbackSubmittedKeyRow } from "../repositories/courseFeedbackRepository.js";
/** Map key aligned with `enrichEnrollmentWithFeedback` in studentAcademicsService. */
export declare function courseFeedbackLookupKey(courseCode: string, term: string, year: number): string;
export declare function feedbackSubmittedAtMapFromDbRows(rows: CourseFeedbackSubmittedKeyRow[]): Map<string, string>;
/** For merging into GET /academics `enrollmentHistory` (combined registration + attempts; skips DB for demo / empty id). */
export declare function getFeedbackSubmittedAtMapForStudent(studentId: string): Promise<Map<string, string>>;
//# sourceMappingURL=studentCourseFeedbackService.d.ts.map