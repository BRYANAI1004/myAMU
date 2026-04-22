type OpaqueDataInput = {
    dataDescriptor: string;
    dataValue: string;
};
type ChargeOpaqueDataInput = {
    amount: number;
    opaqueData: OpaqueDataInput;
    referenceId: string;
    invoiceNumber: string;
    studentId: string;
    termCode: string;
};
export type AuthorizeNetChargeResult = {
    transactionId: string;
    authCode: string | null;
    networkMessage: string;
};
export declare function chargeAuthorizeOpaqueData(input: ChargeOpaqueDataInput): Promise<AuthorizeNetChargeResult>;
export {};
//# sourceMappingURL=authorizeNetGatewayService.d.ts.map