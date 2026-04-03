import type { AccountContext, AccountCurrentTerm, AccountScheduleTermOption, StudentAccountPayload } from "../types/studentAccount.js";
export declare function assembleStudentAccountPayload(ctx: AccountContext, options?: {
    termChargeEffectiveDate?: string;
    /** When set, overrides `buildAccountCurrentTerm(ctx)` for true active term vs browse term. */
    portalCurrentTerm?: AccountCurrentTerm | null;
    availableScheduleTerms?: AccountScheduleTermOption[];
}): StudentAccountPayload;
//# sourceMappingURL=studentAccountAssembler.d.ts.map