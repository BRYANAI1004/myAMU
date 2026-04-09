export type CourseFeedbackApiRecord = {
    id: number;
    courseCode: string;
    term: string;
    year: number;
    q1Rating: number;
    q2Rating: number;
    q3Rating: number;
    q4Rating: number;
    q5Rating: number;
    overallRating: number;
    comment: string | null;
    submittedAt: string;
};
export type SubmitCourseFeedbackBody = {
    term: string;
    year: number;
    courseCode: string;
    q1Rating: number;
    q2Rating: number;
    q3Rating: number;
    q4Rating: number;
    q5Rating: number;
    overallRating: number;
    comment: string | null;
};
export declare function parseSubmitCourseFeedbackBody(body: unknown): SubmitCourseFeedbackBody | null;
export type SubmitCourseFeedbackResult = {
    ok: true;
} | {
    ok: false;
    status: 400 | 409;
    message: string;
};
export declare function submitCourseFeedback(studentExternalId: string, body: SubmitCourseFeedbackBody): Promise<SubmitCourseFeedbackResult>;
export declare function getCourseFeedbackForQuery(studentExternalId: string, query: {
    term: string;
    year: number;
    courseCode: string;
}): Promise<CourseFeedbackApiRecord | null>;
//# sourceMappingURL=courseFeedbackService.d.ts.map