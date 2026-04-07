import { type EnrollSectionInput } from "../repositories/studentEnrollmentRepository.js";
export type { EnrollSectionInput };
/**
 * Registers sections under the academic term’s `term_name` and `year`. Those values are the same
 * quarter key used by `portal_enrollments` and by finance (`getAccountingQuartersPayload` /
 * `getAccountingLedgerPayload` portal fallback), so a completed registration appears on the ledger
 * for that term without hardcoded quarter data.
 */
export declare function enrollStudentForAcademicTerm(studentId: string, academicTermId: string, sections: EnrollSectionInput[]): Promise<{
    ok: true;
    insertedCount: number;
} | {
    ok: false;
    error: string;
}>;
//# sourceMappingURL=studentEnrollmentService.d.ts.map