import type { BillingCategory } from "../types/studentAccount.js";
export type PaymentChargeBucket = "tuition" | "clinic_fee" | "exam_fee" | "late_fee";
export type LedgerRowForTuitionFlow = {
    type: string;
    code: string;
    memo: string;
    debit: number;
    credit: number;
    sourceType?: string;
    billingAdjustmentSource?: string;
    /** Set for portal billing adjustment rows so clinical/exam post charges never hit Pay Tuition. */
    billingAdjustmentCategory?: BillingCategory;
};
export declare function inferPaymentChargeTypeFromMemo(memo: string): PaymentChargeBucket | null;
/**
 * Classifies a **credit** ledger row into a payment bucket (typed allocation + tuition inference).
 * Uses `billingAdjustmentCategory` on portal adjustment credits so exam/clinical payments are not
 * treated as uncategorized tuition when the memo omits keywords.
 */
export declare function inferPaymentBucketForCredit(row: LedgerRowForTuitionFlow): PaymentChargeBucket | null;
/** Debit-side bucket for term charge allocation (matches Pay Tuition / clinic / exam / late fee flows). */
export declare function classifyDebitChargeBucket(row: LedgerRowForTuitionFlow): PaymentChargeBucket | null;
export declare function summarizeLedgerRowsIntoChargeBuckets(rows: LedgerRowForTuitionFlow[]): {
    chargeTotals: Record<PaymentChargeBucket, number>;
    paymentTotals: Record<PaymentChargeBucket, number>;
    unassignedPayments: number;
};
export declare function distributeUnassignedPaymentsToBuckets(chargeTotals: Record<PaymentChargeBucket, number>, paymentTotals: Record<PaymentChargeBucket, number>, unassignedPayments: number): Record<PaymentChargeBucket, number>;
//# sourceMappingURL=ledgerTuitionFlowMath.d.ts.map