/** Thrown when `getStudentClinicalSchedule` receives an invalid student id (maps to HTTP 400). */
export declare class ClinicalScheduleValidationError extends Error {
    constructor(message: string);
}
export type ClinicalScheduleSessionDto = {
    id: number;
    studentId: string;
    courseCode: string;
    sessionDate: string;
    sessionName: string | null;
    site: string | null;
    faculty: string | null;
    status: string;
};
export declare function getStudentClinicalSchedule(studentId: string): Promise<ClinicalScheduleSessionDto[]>;
export type AssignClinicalSessionBody = {
    studentId: string;
    courseCode: string;
    sessionDate: string;
    sessionName?: string | null;
    site?: string | null;
    faculty?: string | null;
    status?: string | null;
};
export type AssignClinicalSessionResult = {
    ok: true;
    id: number;
} | {
    ok: false;
    error: string;
    status: number;
};
export declare function assignClinicalSession(body: AssignClinicalSessionBody): Promise<AssignClinicalSessionResult>;
//# sourceMappingURL=clinicalScheduleService.d.ts.map