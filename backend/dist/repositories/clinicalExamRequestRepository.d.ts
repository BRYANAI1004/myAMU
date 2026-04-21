import type { Pool } from "mysql2/promise";
type DbExec = Pick<Pool, "execute">;
export type ClinicalExamRequestDbRow = {
    id: number;
    student_id: string;
    exam_code: string;
    exam_name: string;
    term: string;
    year: number;
    status: string;
    assigned_exam_date: string | Date | null;
    assigned_exam_time: string | null;
    assigned_by: string | null;
    assigned_at: Date | string | null;
    notes: string | null;
    billing_adjustment_id: number | null;
    created_at: Date | string;
    updated_at: Date | string;
};
export declare function clinicalExamRequestHasActiveDuplicate(exec: DbExec, studentId: string, examCode: string): Promise<boolean>;
export declare function insertClinicalExamRequest(exec: DbExec, params: {
    studentId: string;
    examCode: string;
    examName: string;
    term: string;
    year: number;
    billingAdjustmentId: number;
}): Promise<number>;
export declare function listClinicalExamRequestsForStudent(exec: DbExec, studentId: string): Promise<ClinicalExamRequestDbRow[]>;
export declare function listClinicalExamRequestsForAdmin(exec: DbExec): Promise<ClinicalExamRequestDbRow[]>;
export declare function getClinicalExamRequestById(exec: DbExec, id: number): Promise<ClinicalExamRequestDbRow | null>;
export declare function updateClinicalExamRequestFields(exec: DbExec, id: number, fields: {
    assignedExamDate: string | null;
    assignedExamTime: string | null;
    notes: string | null;
    status: string;
    assignedBy: string | null;
}): Promise<boolean>;
export {};
//# sourceMappingURL=clinicalExamRequestRepository.d.ts.map