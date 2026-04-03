import type { MarksRow } from "../repositories/studentAcademicsRepository.js";
import type { AccountCurrentTerm, AccountRegistration, ScheduleRow } from "../types/studentAccount.js";
export declare function quarterOrderForTerm(term: string): number;
export declare function buildAccountCurrentTerm(term: string, year: number): AccountCurrentTerm;
export declare function deriveAccountRegistration(args: {
    scheduleRows: ScheduleRow[];
    termLabel: string;
    /** Legacy portal path: count of enrollments when schedule rows are empty. */
    enrollmentSourceCount?: number;
    /** Legacy real-student path: true while the registration term is still academically open on `marks`. */
    academicEnrollmentActive?: boolean;
    /** Count of `marks` rows for the billing/registration term (messaging only). */
    marksRowsForRegistrationTerm?: number;
}): AccountRegistration;
/**
 * Legacy account schedule lines from `marks` for the billing term.
 * Uses the same normalized academic course record mapping as `/academics`.
 */
export declare function scheduleRowsFromLegacyMarks(marks: MarksRow[], studentId: string): ScheduleRow[];
//# sourceMappingURL=studentAccountDashboard.d.ts.map