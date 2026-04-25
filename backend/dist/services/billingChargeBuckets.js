import { LATE_FEE_DESCRIPTION } from "../repositories/adminFinanceRepository.js";
function roundMoney(n) {
    return Math.round(n * 100) / 100;
}
export function isLateFeeRow(args) {
    if (String(args.sourceType ?? "").trim().toLowerCase() === "auto_late_fee") {
        return true;
    }
    return new RegExp(`^${LATE_FEE_DESCRIPTION}$`, "i").test(args.memo.trim());
}
export function isExamFeeMemo(memo) {
    const m = memo.trim();
    if (/\badditional\s+exam\b/i.test(m))
        return true;
    return /exam\s*fee|\bexam\b/i.test(m);
}
/**
 * Clinical **booking / reservation** charges (Pay Clinic Fee), not didactic tuition rows.
 * Course-based clinical clock-hour tuition stays in the tuition bucket (portal uses type "Tuition").
 */
export function isClinicBucketCharge(args) {
    const type = args.type.trim().toLowerCase();
    const code = args.code.trim().toLowerCase();
    const memo = args.memo.trim().toLowerCase();
    const sourceType = String(args.sourceType ?? "")
        .trim()
        .toLowerCase();
    if (type === "clinical")
        return true;
    if (sourceType === "system" &&
        type === "adjustment" &&
        /\bclinical\b/.test(memo)) {
        return true;
    }
    if (/(clinic|clinical)/.test(code))
        return true;
    return /(clinic\s*(fee|insurance|insurances)|clinical\s*(fee|booking|appointment|slot|enrollment|request))/i.test(memo);
}
/**
 * Term academic charges that belong with Pay Tuition: course tuition, quarter/institutional fees
 * (e.g. technology/facility, malpractice when posted), tuition installment service fees, and other
 * term charges that are not exam fees, late fees, or clinical booking fees.
 */
export function isTuitionBucketCharge(args) {
    if (isLateFeeRow(args))
        return false;
    if (isExamFeeMemo(args.memo))
        return false;
    if (isClinicBucketCharge(args))
        return false;
    return true;
}
/** Gross assessed charges in the tuition bucket (sum of debit amounts) for one term ledger. */
export function getTermTuitionPayableTotal(rows) {
    let total = 0;
    for (const row of rows) {
        const debit = roundMoney(Math.max(0, Number(row.debit) || 0));
        if (debit <= 0)
            continue;
        if (isTuitionBucketCharge({
            type: String(row.type ?? ""),
            code: String(row.code ?? ""),
            memo: String(row.memo ?? ""),
            sourceType: row.sourceType,
        })) {
            total = roundMoney(total + debit);
        }
    }
    return roundMoney(total);
}
//# sourceMappingURL=billingChargeBuckets.js.map