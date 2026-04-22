type OpaqueDataInput = {
    dataDescriptor: string;
    dataValue: string;
};
export type AuthorizeChargeBody = {
    term: string;
    amount: number;
    opaqueData: OpaqueDataInput;
};
export type AuthorizeChargeResult = {
    amount: string;
    providerTransactionId: string;
    invoiceNumber: string;
};
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
    opaqueData: OpaqueDataInput;
}): Promise<AuthorizeChargeResult>;
export {};
//# sourceMappingURL=studentAuthorizePaymentService.d.ts.map