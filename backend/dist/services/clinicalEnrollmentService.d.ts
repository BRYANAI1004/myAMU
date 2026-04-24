import { type ClinicalEnrollmentSlotRow, type ClinicalEnrollmentStudentRow, type ClinicalSeatBucket, type ClinicalSlotRosterAdminRow } from "../repositories/clinicalEnrollmentRepository.js";
export type OpenClinicalSlotForStudentDto = ClinicalEnrollmentSlotRow & {
    alreadyEnrolled: boolean;
};
export type AdminClinicalSlotRosterDto = ClinicalSlotRosterAdminRow & {
    clinicalCode: string | null;
    clinicalBaseCode: string | null;
    clinicalGrade: string;
    clinicalGrade2: number | null;
};
export declare function listOpenClinicalSlotsForStudent(studentId: string, query?: {
    term?: string | null;
    year?: string | number | null;
}): Promise<OpenClinicalSlotForStudentDto[]>;
/**
 * Enrolled clinical timetable rows after query-time revocation of unpaid expired registrations.
 * Single entry point for student schedule / roster-style reads.
 */
export declare function getActiveClinicalBookings(studentId: string, query?: {
    term?: string | null;
    year?: string | number | null;
}): Promise<ClinicalEnrollmentStudentRow[]>;
export declare function listStudentClinicalEnrollmentRows(studentId: string, query?: {
    term?: string | null;
    year?: string | number | null;
}): Promise<ClinicalEnrollmentStudentRow[]>;
export type ClinicalEnrollmentWithBillingResult = {
    ok: true;
    enrollment: {
        enrollmentId: number;
        assignmentId: number;
        studentId: string;
        timetableId: number;
        term: string;
        year: number;
        seatBucket: ClinicalSeatBucket | null;
    };
    billingAdjustment: {
        id: number;
        amount: number;
        category: "clinical";
        adjustmentSource: "system_clinical";
    } | null;
    paymentHold: {
        created: boolean;
    } | null;
} | {
    ok: false;
    error: string;
    status: number;
};
export declare function enrollStudentInClinicalSlot(studentId: string, timetableId: number, seatBucketFromRequest: unknown): Promise<ClinicalEnrollmentWithBillingResult>;
export declare function adminAddStudentToClinicalSlot(timetableId: number, studentId: string, seatBucketFromRequest: unknown): Promise<ClinicalEnrollmentWithBillingResult>;
export declare function listAdminClinicalSlotRoster(timetableId: number): Promise<AdminClinicalSlotRosterDto[]>;
/**
 * Admin removes a student from a slot: same non-destructive drop as student self-serve.
 * Verifies the enrollment belongs to the given timetable row.
 */
export declare function adminDropClinicalEnrollmentForSlot(timetableId: number, studentId: string, enrollmentId: number): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
    status: number;
}>;
export declare function dropStudentClinicalEnrollment(studentId: string, enrollmentId: number): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
    status: number;
}>;
//# sourceMappingURL=clinicalEnrollmentService.d.ts.map