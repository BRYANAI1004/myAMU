export { proportionalProcessingFeeRefund } from "./creditCardProcessingFee.js";
type OpaqueDataInput = {
    dataDescriptor: string;
    dataValue: string;
};
export type PaymentChargeType = "tuition" | "clinic_fee" | "exam_fee" | "late_fee";
export type PaymentPlan = "full" | "installment";
export type PaymentChargeStatus = "pending" | "paid";
export type ClinicFeeStatus = "pending" | "paid" | "expired" | "registration_cancelled";
export type AuthorizeChargeBody = {
    term: string;
    amount: number;
    chargeType: PaymentChargeType;
    paymentPlan: PaymentPlan;
    installmentCount: 1 | 2 | 3;
    opaqueData: OpaqueDataInput;
    /** First 6–8 digits of the PAN (BIN); used only for credit vs debit fee rules. */
    cardBinPrefix: string;
};
export type AuthorizeChargeResult = {
    /** Total charged to the card (base + processing fee). */
    amount: string;
    baseAmount: string;
    processingFee: string;
    cardFunding: "credit" | "debit" | "unknown";
    providerTransactionId: string;
    invoiceNumber: string;
};
export type BillingChargeBucket = {
    type: PaymentChargeType;
    term: string;
    amount: number;
    amountPaid: number;
    amountDue: number;
    status: PaymentChargeStatus;
    dueDate: string | null;
    isInstallmentEligible: boolean;
};
export type CurrentTermBillingSummary = {
    term: string;
    year: number;
    paymentDeadline: string | null;
    tuitionCharge: BillingChargeBucket;
    clinicFeeCharge: BillingChargeBucket;
    clinicFeeStatus: ClinicFeeStatus;
    examFeeCharge: BillingChargeBucket;
    lateFeeCharge: BillingChargeBucket;
    requiredBalanceDue: number;
    totalBalanceDue: number;
};
export declare function getCurrentTermBillingSummary(input: {
    studentId: string;
    termInput: string;
    emitTuitionSummaryDebugLog?: boolean;
}): Promise<CurrentTermBillingSummary>;
export type TuitionOnlyBillingSummary = {
    term: string;
    year: number;
    paymentDeadline: string | null;
    tuitionCharge: BillingChargeBucket;
    lateFeeCharge: BillingChargeBucket;
    examFeeCharge: BillingChargeBucket;
    tuitionTotalDue: number;
};
export type ClinicFeeBillingSummary = {
    term: string;
    year: number;
    paymentDeadline: string | null;
    clinicFeeCharge: BillingChargeBucket;
    clinicFeeStatus: ClinicFeeStatus;
};
export declare function getTuitionOnlyBillingSummary(input: {
    studentId: string;
    termInput: string;
}): Promise<TuitionOnlyBillingSummary>;
export declare function getClinicFeeBillingSummary(input: {
    studentId: string;
    termInput: string;
}): Promise<ClinicFeeBillingSummary>;
export declare function parseAuthorizeChargeBody(raw: unknown): {
    ok: true;
    value: AuthorizeChargeBody;
} | {
    ok: false;
    error: string;
};
export declare function processAuthorizeNetStudentPayment(input: {
    studentId: string;
    termInput: string;
    amount: number;
    chargeType: PaymentChargeType;
    paymentPlan: PaymentPlan;
    installmentCount: 1 | 2 | 3;
    opaqueData: OpaqueDataInput;
    cardBinPrefix: string;
}): Promise<AuthorizeChargeResult>;
//# sourceMappingURL=studentAuthorizePaymentService.d.ts.map