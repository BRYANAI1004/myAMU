export type ClinicalExamRequestApi = {
    id: number;
    studentId: string;
    studentName: string | null;
    examCode: string;
    examName: string;
    term: string;
    year: number;
    status: string;
    assignedExamDate: string | null;
    assignedExamTime: string | null;
    assignedBy: string | null;
    assignedAt: string | null;
    notes: string | null;
    billingAdjustmentId: number | null;
    registrationFeeUsd: number;
    createdAt: string;
    updatedAt: string;
};
export declare function createStudentClinicalExamRequest(studentId: string, examCodeRaw: string, termRaw: string, yearRaw: number): Promise<{
    ok: true;
    request: ClinicalExamRequestApi;
} | {
    ok: false;
    status: number;
    error: string;
}>;
export declare function listStudentClinicalExamRequestsApi(studentId: string): Promise<ClinicalExamRequestApi[]>;
export declare function listAdminClinicalExamRequestsApi(): Promise<ClinicalExamRequestApi[]>;
export type ClinicalExamAssignPatch = {
    assignedExamDate?: string | null;
    assignedExamTime?: string | null;
    notes?: string;
    status?: string;
    grade?: string;
    term?: string;
    year?: number;
};
export declare function assignClinicalExamRequest(id: number, patch: ClinicalExamAssignPatch, assignedBy: string | null): Promise<{
    ok: true;
    request: ClinicalExamRequestApi;
} | {
    ok: false;
    status: number;
    error: string;
}>;
//# sourceMappingURL=clinicalExamRequestService.d.ts.map