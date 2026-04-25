import type { BillingCategory } from "../types/studentAccount.js";
import {
  isClinicBucketCharge,
  isExamFeeMemo,
  isLateFeeRow,
} from "./billingChargeBuckets.js";

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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function debitLooksExam(args: {
  isAdjustment: boolean;
  memo: string;
  code: string;
  adjCat?: BillingCategory;
  adjSrcNorm: string;
}): boolean {
  if (args.adjSrcNorm === "system_exam") return true;
  if (args.isAdjustment && args.adjCat === "exam") return true;
  if (isExamFeeMemo(args.memo)) return true;
  if (args.code.trim() !== "" && isExamFeeMemo(args.code)) return true;
  return false;
}

export function inferPaymentChargeTypeFromMemo(memo: string): PaymentChargeBucket | null {
  const m = memo.trim().toLowerCase();
  const explicit = /authorize\.net\s+(tuition|clinic_fee|exam_fee|late_fee)\b/.exec(
    m,
  );
  if (explicit) {
    return explicit[1] as PaymentChargeBucket;
  }
  if (/\[admin_manual_payment\][^\n]*\bexam\b/.test(m)) return "exam_fee";
  if (/\badditional\s+exam\b/.test(m)) return "exam_fee";
  if (/(clinic|clinical)/.test(m)) return "clinic_fee";
  if (/\blate\s*payment\s*fee|late\s*fee/.test(m)) return "late_fee";
  if (/\bexam\b|exam\s*fee/.test(m)) return "exam_fee";
  if (/\btuition\b/.test(m)) return "tuition";
  return null;
}

/**
 * Classifies a **credit** ledger row into a payment bucket (typed allocation + tuition inference).
 * Uses `billingAdjustmentCategory` on portal adjustment credits so exam/clinical payments are not
 * treated as uncategorized tuition when the memo omits keywords.
 */
export function inferPaymentBucketForCredit(row: LedgerRowForTuitionFlow): PaymentChargeBucket | null {
  const credit = roundMoney(Math.max(0, Number(row.credit) || 0));
  if (credit <= 0) return null;

  const typeLower = String(row.type ?? "").trim().toLowerCase();
  const memo = String(row.memo ?? "").trim();
  const code = String(row.code ?? "").trim();
  const adjSrcNorm = String(row.billingAdjustmentSource ?? "").trim().toLowerCase();

  if (adjSrcNorm === "system_late_fee_reversal") {
    return "late_fee";
  }

  if (typeLower === "adjustment") {
    const adjCat = row.billingAdjustmentCategory;
    if (adjCat === "exam" || adjSrcNorm === "system_exam") {
      return "exam_fee";
    }
    if (adjCat === "clinical" || adjSrcNorm === "system_clinical") {
      return "clinic_fee";
    }
    const examMemo = isExamFeeMemo(memo) || (code !== "" && isExamFeeMemo(code));
    const clinicalMemo = /(clinic|clinical)/i.test(memo);
    if (clinicalMemo && !examMemo) {
      return "clinic_fee";
    }
    if (examMemo) {
      return "exam_fee";
    }
    if (adjCat === "tuition" || adjCat === "fees" || adjCat === "other") {
      return "tuition";
    }
    return inferPaymentChargeTypeFromMemo(memo);
  }

  return inferPaymentChargeTypeFromMemo(memo);
}

/** Debit-side bucket for term charge allocation (matches Pay Tuition / clinic / exam / late fee flows). */
export function classifyDebitChargeBucket(row: LedgerRowForTuitionFlow): PaymentChargeBucket | null {
  const debit = roundMoney(Math.max(0, Number(row.debit) || 0));
  if (debit <= 0) return null;

  const type = String(row.type ?? "").trim();
  const typeLower = type.toLowerCase();
  const code = String(row.code ?? "").trim();
  const memo = String(row.memo ?? "").trim();
  const sourceType = String(row.sourceType ?? "").trim();
  const adjCat = row.billingAdjustmentCategory;
  const isAdjustment = typeLower === "adjustment";
  const adjSrcNorm = String(row.billingAdjustmentSource ?? "").trim().toLowerCase();

  if (
    isLateFeeRow({
      type,
      memo,
      sourceType,
    })
  ) {
    return "late_fee";
  }

  if (isAdjustment && adjCat === "clinical") {
    return "clinic_fee";
  }
  if (adjSrcNorm === "system_clinical") {
    return "clinic_fee";
  }
  if (isAdjustment && adjCat === undefined && isClinicBucketCharge({ type, code, memo, sourceType })) {
    return "clinic_fee";
  }
  if (!isAdjustment && isClinicBucketCharge({ type, code, memo, sourceType })) {
    return "clinic_fee";
  }

  const examDebit = debitLooksExam({
    isAdjustment,
    memo,
    code,
    adjCat,
    adjSrcNorm,
  });
  if (examDebit) {
    return "exam_fee";
  }

  if (
    isAdjustment &&
    (adjCat === "tuition" || adjCat === "fees" || adjCat === "other")
  ) {
    return "tuition";
  }

  if (adjCat === undefined) {
    return "tuition";
  }

  return "tuition";
}

export function summarizeLedgerRowsIntoChargeBuckets(rows: LedgerRowForTuitionFlow[]): {
  chargeTotals: Record<PaymentChargeBucket, number>;
  paymentTotals: Record<PaymentChargeBucket, number>;
  unassignedPayments: number;
} {
  const chargeTotals: Record<PaymentChargeBucket, number> = {
    tuition: 0,
    clinic_fee: 0,
    exam_fee: 0,
    late_fee: 0,
  };
  const paymentTotals: Record<PaymentChargeBucket, number> = {
    tuition: 0,
    clinic_fee: 0,
    exam_fee: 0,
    late_fee: 0,
  };
  let totalCredits = 0;
  for (const row of rows) {
    const debit = roundMoney(Math.max(0, Number(row.debit) || 0));
    const credit = roundMoney(Math.max(0, Number(row.credit) || 0));
    if (debit > 0) {
      const bucket = classifyDebitChargeBucket(row);
      if (bucket != null) {
        chargeTotals[bucket] = roundMoney(chargeTotals[bucket] + debit);
      }
    }
    if (credit > 0) {
      totalCredits = roundMoney(totalCredits + credit);
      const inferred = inferPaymentBucketForCredit(row);
      if (inferred != null) {
        paymentTotals[inferred] = roundMoney(paymentTotals[inferred] + credit);
      }
    }
  }

  const typedPayments = roundMoney(
    paymentTotals.tuition +
      paymentTotals.clinic_fee +
      paymentTotals.exam_fee +
      paymentTotals.late_fee,
  );
  return {
    chargeTotals,
    paymentTotals,
    unassignedPayments: roundMoney(Math.max(0, totalCredits - typedPayments)),
  };
}

export function distributeUnassignedPaymentsToBuckets(
  chargeTotals: Record<PaymentChargeBucket, number>,
  paymentTotals: Record<PaymentChargeBucket, number>,
  unassignedPayments: number,
): Record<PaymentChargeBucket, number> {
  const paid: Record<PaymentChargeBucket, number> = {
    tuition: 0,
    clinic_fee: 0,
    exam_fee: 0,
    late_fee: 0,
  };
  let carry = roundMoney(Math.max(0, unassignedPayments));
  const order: PaymentChargeBucket[] = [
    "tuition",
    "clinic_fee",
    "exam_fee",
    "late_fee",
  ];
  for (const key of order) {
    const target = roundMoney(Math.max(0, chargeTotals[key]));
    if (target <= 0) continue;
    const direct = roundMoney(Math.max(0, paymentTotals[key]));
    const remainingAfterDirect = roundMoney(Math.max(0, target - direct));
    const allocation = roundMoney(Math.min(remainingAfterDirect, carry));
    carry = roundMoney(Math.max(0, carry - allocation));
    paid[key] = roundMoney(Math.min(target, direct + allocation));
  }
  return paid;
}
