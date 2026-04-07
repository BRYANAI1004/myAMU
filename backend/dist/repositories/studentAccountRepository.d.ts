import type { Pool } from "mysql2/promise";
import type { AccountContext } from "../types/studentAccount.js";
/**
 * Latest term/year for which the student has at least one enrollment row.
 * Ordering: highest calendar year first, then Fall > Summer > Spring > Winter within the year.
 */
export declare function findLatestTermYearForStudent(pool: Pool, studentExternalId: string): Promise<{
    term: string;
    year: number;
} | null>;
/**
 * Distinct term/year pairs from `portal_enrollments` for this student.
 * Newest first: year DESC, then Fall > Summer > Spring > Winter within the year.
 */
export declare function listPortalScheduleTermsForStudent(pool: Pool, studentExternalId: string): Promise<{
    term: string;
    year: number;
}[]>;
export declare function loadAccountContext(pool: Pool, studentId: string, term: string, year: number): Promise<AccountContext | null>;
/**
 * Portal billing context for a term/year, including empty enrollments (payments/adjustments only).
 * Used to synthesize a ledger when legacy `accounting` has no rows for that quarter.
 */
export declare function loadPortalTermBillingContext(pool: Pool, studentId: string, term: string, year: number): Promise<AccountContext>;
//# sourceMappingURL=studentAccountRepository.d.ts.map