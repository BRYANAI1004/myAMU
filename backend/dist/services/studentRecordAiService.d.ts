import { type RagAnswerResult } from "./ragService.js";
import type { StudentAcademicCourseRecord } from "../types/studentAcademics.js";
type TermYear = {
    term: string;
    year: number;
};
export type StudentRecordAnswerResult = {
    result: RagAnswerResult;
    usedHelpers: string[];
};
export type StudentRecordFactsResult = {
    contextText: string;
    usedHelpers: string[];
};
export declare function getCurrentTermCourses(studentId: string): Promise<{
    courseCode: string;
    courseTitle: string;
    term: string;
    year: number;
    credits: number | null;
    sectionCode: string | null;
}[]>;
export declare function getCurrentTermCourseCount(studentId: string): Promise<number>;
export declare function getRegisteredTerms(studentId: string): Promise<TermYear[]>;
export declare function getRegisteredTermCount(studentId: string): Promise<number>;
export declare function hasRegistrationInYear(studentId: string, year: number): Promise<boolean>;
export declare function getCurrentTermCredits(studentId: string): Promise<number | null>;
export declare function hasCompletedCourse(studentId: string, courseCode: string): Promise<boolean>;
export declare function getWithdrawalHistory(studentId: string): Promise<StudentAcademicCourseRecord[]>;
export declare function answerDeterministicStudentRecordQuestion(studentId: string, question: string): Promise<StudentRecordAnswerResult | null>;
export declare function buildStudentRecordFactsForQuestion(studentId: string, question: string): Promise<StudentRecordFactsResult | null>;
export {};
//# sourceMappingURL=studentRecordAiService.d.ts.map