import type { Pool } from "mysql2/promise";
import { type LedgerRowForTuitionFlow, type PaymentChargeBucket } from "./ledgerTuitionFlowMath.js";
/** Operator-facing Pay Tuition balance composition (single `[tuition-summary breakdown]` log line). */
export declare function logTuitionSummaryBreakdown(args: {
    studentId: string;
    term: string;
    year: number;
    rows: LedgerRowForTuitionFlow[];
    snapshot: TuitionBalanceSnapshotDetails;
}): void;
export type TuitionBalanceForTermResult = {
    resolvedStudentId: string;
    term: string;
    year: number;
    /** Gross tuition-bucket charges before payment allocation. */
    tuitionCharges: number;
    /** Tuition + fees + other adjustment debits (subset of tuition bucket ex. course lines). */
    tuitionAdjustments: number;
    /** Payments typed or allocated to tuition (after distribution). */
    tuitionPayments: number;
    lateFees: number;
    lateFeePayments: number;
    excludedClinical: number;
    excludedExam: number;
    /** Same as student Pay Tuition `tuitionCharge.amountDue` + `lateFeeCharge.amountDue`. */
    tuitionBalanceDue: number;
    tuitionChargeAmountDue: number;
    lateFeeChargeAmountDue: number;
};
export type TuitionBalanceSnapshotDetails = TuitionBalanceForTermResult & {
    chargeTotals: Record<PaymentChargeBucket, number>;
    paidAllocations: Record<PaymentChargeBucket, number>;
};
export declare function computeTuitionBalanceSnapshot(args: {
    requestedStudentId: string;
    resolvedStudentId: string;
    term: string;
    year: number;
    rows: LedgerRowForTuitionFlow[];
}): TuitionBalanceSnapshotDetails;
/**
 * Single source of truth for Pay Tuition balance (tuition + late fee buckets, portal presentation).
 */
export declare function getTuitionBalanceForTerm(db: Pool, input: {
    studentId: string;
    term: string;
    year: number;
    /** When set, logs `[tuition-summary]` for operator verification. */
    logLabel?: "tuition-summary";
    requestedStudentId?: string;
    /** When already resolved upstream, skips duplicate lookup. */
    resolvedStudentId?: string;
}): Promise<TuitionBalanceForTermResult | null>;
//# sourceMappingURL=tuitionBalanceService.d.ts.map