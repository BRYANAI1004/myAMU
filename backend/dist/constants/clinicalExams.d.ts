export declare const CLINICAL_EXAMS: readonly [{
    readonly code: "CL100";
    readonly name: "Clinic Entrance Exam";
}, {
    readonly code: "CL110";
    readonly name: "Clinic Practical Exam";
}, {
    readonly code: "CL120";
    readonly name: "Clinic Level I Exit Exam";
}, {
    readonly code: "CL200";
    readonly name: "Clinic Level II Exit Exam";
}, {
    readonly code: "CL300";
    readonly name: "Clinic Level III Exit Exam";
}];
export type ClinicalExamCode = (typeof CLINICAL_EXAMS)[number]["code"];
export declare function resolveClinicalExam(examCodeRaw: string): {
    code: ClinicalExamCode;
    name: string;
} | null;
//# sourceMappingURL=clinicalExams.d.ts.map