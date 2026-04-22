export type SetAdminMarkGradeInput = {
    studentId: string;
    courseCode: string;
    /** Portal `academic_terms.id` (UUID). */
    academicTermId: string;
    grade: string;
};
export type SetAdminMarkGradeResult = {
    ok: true;
} | {
    ok: false;
    error: string;
    status: number;
};
export type AdminClinicalEnrollmentGradeSnapshot = {
    enrollmentId: number;
    studentId: string;
    clinicalBaseCode: string | null;
    clinicalCode: string | null;
    grade: string;
    grade2: number | null;
};
export type SetAdminClinicalEnrollmentGradeInput = {
    timetableId: number;
    enrollmentId: number;
    studentId: string;
    grade: string;
    grade2?: number | null;
};
export type SetAdminClinicalEnrollmentGradeResult = {
    ok: true;
    clinicalCode: string;
    clinicalBaseCode: string;
} | {
    ok: false;
    error: string;
    status: number;
};
export declare function setAdminStudentMarkGrade(input: SetAdminMarkGradeInput): Promise<SetAdminMarkGradeResult>;
export declare function getAdminClinicalEnrollmentGradeSnapshot(args: {
    timetableId: number;
    enrollmentId: number;
    studentId: string;
}): Promise<AdminClinicalEnrollmentGradeSnapshot | null>;
export declare function setAdminClinicalEnrollmentGrade(input: SetAdminClinicalEnrollmentGradeInput): Promise<SetAdminClinicalEnrollmentGradeResult>;
//# sourceMappingURL=adminMarksService.d.ts.map