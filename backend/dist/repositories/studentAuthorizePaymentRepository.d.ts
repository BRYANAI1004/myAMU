type RecordAuthorizePaymentInput = {
    studentId: string;
    term: string;
    year: number;
    amount: number;
    paidAt: string;
    method: string;
    description: string | null;
    providerTransactionId: string;
    invoiceNumber: string;
    status: "pending" | "succeeded" | "failed";
};
/**
 * Stores payment in `portal_payments` (ledger source of truth) and writes an
 * optional provider transaction row when `portal_payment_transactions` exists.
 */
export declare function recordAuthorizeNetPayment(input: RecordAuthorizePaymentInput): Promise<void>;
export {};
//# sourceMappingURL=studentAuthorizePaymentRepository.d.ts.map