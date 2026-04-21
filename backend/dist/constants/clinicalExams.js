export const CLINICAL_EXAMS = [
    { code: "CL100", name: "Clinic Entrance Exam" },
    { code: "CL110", name: "Clinic Practical Exam" },
    { code: "CL120", name: "Clinic Level I Exit Exam" },
    { code: "CL200", name: "Clinic Level II Exit Exam" },
    { code: "CL300", name: "Clinic Level III Exit Exam" },
];
const CODE_SET = new Set(CLINICAL_EXAMS.map((e) => e.code.toUpperCase()));
export function resolveClinicalExam(examCodeRaw) {
    const code = examCodeRaw.trim().toUpperCase();
    if (!CODE_SET.has(code))
        return null;
    const row = CLINICAL_EXAMS.find((e) => e.code === code);
    return row ? { code: row.code, name: row.name } : null;
}
//# sourceMappingURL=clinicalExams.js.map