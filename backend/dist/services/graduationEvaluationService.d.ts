export type GraduationEvaluationResult = {
    eligible: boolean;
    program: string | null;
    track: string | null;
    ruleSetId: string;
    ruleSetSource: string;
    earnedCredits: number;
    totalCredits: number;
    transcriptCredits: number;
    transferCredits: number;
    requiredCredits: number;
    missingCredits: number;
    completedRequiredCourses: string[];
    missingCourses: string[];
    cumulativeGpa: number | null;
    requiredGpa: number | null;
    missingGpa: number | null;
    withdrawalCount: number;
    maximumWithdrawals: number | null;
    notes: string[];
};
export type GraduationEvaluationSummary = Pick<GraduationEvaluationResult, "earnedCredits" | "requiredCredits" | "eligible" | "missingCredits">;
export declare function formatDeterministicGraduationAnswer(question: string, evaluation: GraduationEvaluationSummary): string;
export declare function evaluateGraduation(studentId: string): Promise<GraduationEvaluationResult>;
export declare const evaluateStudentGraduation: typeof evaluateGraduation;
export declare function formatGraduationEvaluationFacts(evaluation: GraduationEvaluationResult): string;
//# sourceMappingURL=graduationEvaluationService.d.ts.map