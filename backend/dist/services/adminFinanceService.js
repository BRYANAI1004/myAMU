import { pool } from "../lib/db.js";
import { academicTermsPaymentDueDateColumnExists, countAdminFinanceRosterSearchOnly, deleteManualBillingAdjustment, deletePortalPayment, getBillingAdjustmentById, getFinanceQuarterDdlFromAcademicTerms, getPortalPaymentById, insertPortalBillingAdjustment, insertPortalPayment, insertSystemLateFee, insertSystemLateFeeReversal, listAdminFinanceRosterAllSearchOnlyOrdered, listAdminFinanceRosterPageSearchOnly, listGlobalFinanceQuarters, listSystemLateFeeRowsForQuarter, listStudentIdsWithPortalQuarterActivity, sumPortalBillingAdjustmentsNetByStudentForQuarter, sumPortalPaymentsByStudentForQuarter, setFinanceQuarterDdlOnAcademicTerms, updateManualBillingAdjustment, updatePortalPayment, } from "../repositories/adminFinanceRepository.js";
import { batchLoadPortalTermBillingContextsForQuarter } from "../repositories/studentAccountRepository.js";
import { loadLegacyAccountingRows, sumLegacyAccountingBalanceByStudentForQuarter, } from "../repositories/studentLegacyAccountRepository.js";
import { computePortalOnlyQuarterNetBalance, getAccountingLedgerPayload, getAccountingQuartersPayload, } from "./studentLedgerService.js";
import { isPastSchoolLocalDueDate } from "../lib/schoolLocalDate.js";
import { distributeUnassignedPaymentsToBuckets, summarizeLedgerRowsIntoChargeBuckets, } from "./ledgerTuitionFlowMath.js";
import { computeTuitionBalanceSnapshot } from "./tuitionBalanceService.js";
import { resolveCanonicalStudentExternalId } from "../repositories/studentIdentityRepository.js";
const CHARGE_CATEGORIES = [
    "fees",
    "other",
    "tuition",
    "clinical",
    "exam",
];
function roundMoney(n) {
    return Math.round(n * 100) / 100;
}
function formatQuarterLabel(term, year) {
    const t = term.trim();
    if (t.length === 0)
        return String(year);
    const head = t.slice(0, 1).toUpperCase();
    const tail = t.slice(1).toLowerCase();
    return `${head}${tail} ${year}`;
}
export async function listGlobalQuartersPayload() {
    const pairs = await listGlobalFinanceQuarters(pool);
    return {
        quarters: pairs.map((p) => ({
            term: p.term,
            year: p.year,
            label: formatQuarterLabel(p.term, p.year),
        })),
    };
}
export async function getQuarterSettingsPayload(term, year) {
    const y = Math.trunc(year);
    const t = term.trim();
    const hasCol = await academicTermsPaymentDueDateColumnExists(pool);
    const { paymentDueDate, rowExists } = await getFinanceQuarterDdlFromAcademicTerms(pool, t, y);
    const ddlPersistenceAvailable = hasCol && rowExists;
    let ddlSaveNote = null;
    if (!ddlPersistenceAvailable) {
        if (!hasCol) {
            ddlSaveNote =
                "Payment DDL persistence is not yet enabled on academic terms.";
        }
        else {
            ddlSaveNote =
                "No matching academic term row for this quarter. Create it under Academic Terms before saving a payment due date.";
        }
    }
    return {
        term: t,
        year: y,
        paymentDueDate,
        lateFeeEnabled: true,
        lateFeeAmount: 30,
        ddlPersistenceAvailable,
        ddlSaveNote,
    };
}
/** Active system late fee rows must be reversible when DDL says no late fee yet (no due date / due date in the future). */
function shouldReverseActiveSystemLateFeesRegardlessOfLedger(eligibility) {
    return (!eligibility.eligible &&
        (eligibility.reason === "due_date_not_passed" ||
            eligibility.reason === "missing_due_date"));
}
async function evaluateLateFeeEligibility(studentId, term, year, paymentDueDate) {
    const due = paymentDueDate?.trim() ?? "";
    if (due === "") {
        return {
            eligible: false,
            tuitionOutstanding: 0,
            lateFeeOutstanding: 0,
            reason: "missing_due_date",
        };
    }
    if (!isPastSchoolLocalDueDate(due)) {
        return {
            eligible: false,
            tuitionOutstanding: 0,
            lateFeeOutstanding: 0,
            reason: "due_date_not_passed",
        };
    }
    const legacy = await loadLegacyAccountingRows(pool, studentId, term, year);
    if (legacy.length > 0) {
        return {
            eligible: false,
            tuitionOutstanding: 0,
            lateFeeOutstanding: 0,
            reason: "legacy_accounting_exists",
        };
    }
    const ledger = await getAccountingLedgerPayload(studentId, term, year, {
        skipExpiredClinicalBookingReconciliation: true,
        skipLateFeeEvaluation: true,
    });
    const rows = (ledger?.rows ?? []);
    const summarized = summarizeLedgerRowsIntoChargeBuckets(rows);
    const paid = distributeUnassignedPaymentsToBuckets(summarized.chargeTotals, summarized.paymentTotals, summarized.unassignedPayments);
    const tuitionOutstanding = roundMoney(Math.max(0, summarized.chargeTotals.tuition - paid.tuition));
    const lateFeeOutstanding = roundMoney(Math.max(0, summarized.chargeTotals.late_fee - paid.late_fee));
    if (tuitionOutstanding <= 0) {
        return {
            eligible: false,
            tuitionOutstanding,
            lateFeeOutstanding,
            reason: "no_outstanding_tuition",
        };
    }
    return {
        eligible: true,
        tuitionOutstanding,
        lateFeeOutstanding,
        reason: "eligible",
    };
}
export async function previewLateFeeReconciliationForQuarter(term, year, paymentDueDateOverride) {
    const t = term.trim();
    const y = Math.trunc(year);
    const current = await getFinanceQuarterDdlFromAcademicTerms(pool, t, y);
    const dueDate = paymentDueDateOverride === undefined
        ? current.paymentDueDate
        : paymentDueDateOverride;
    const studentIds = await listStudentIdsWithPortalQuarterActivity(pool, t, y);
    const feeRows = await listSystemLateFeeRowsForQuarter(pool, t, y);
    const activeByStudent = new Map();
    for (const row of feeRows) {
        if (row.activeAmount <= 0)
            continue;
        const key = row.studentExternalId.trim();
        const arr = activeByStudent.get(key) ?? [];
        arr.push(row);
        activeByStudent.set(key, arr);
    }
    let wouldAddSystemLateFeeCount = 0;
    let wouldReverseInvalidSystemLateFeeCount = 0;
    let wouldRequireManualReviewCount = 0;
    let sampleReversalStudentId = null;
    for (const studentId of studentIds) {
        const eligible = await evaluateLateFeeEligibility(studentId, t, y, dueDate);
        const activeFees = activeByStudent.get(studentId) ?? [];
        if (eligible.eligible) {
            if (activeFees.length === 0) {
                wouldAddSystemLateFeeCount += 1;
            }
            continue;
        }
        if (activeFees.length === 0)
            continue;
        if (eligible.lateFeeOutstanding > 0 ||
            shouldReverseActiveSystemLateFeesRegardlessOfLedger(eligible)) {
            wouldReverseInvalidSystemLateFeeCount += activeFees.length;
            if (sampleReversalStudentId == null) {
                sampleReversalStudentId = studentId;
            }
        }
        else {
            wouldRequireManualReviewCount += activeFees.length;
        }
    }
    return {
        term: t,
        year: y,
        paymentDueDate: dueDate,
        studentsScanned: studentIds.length,
        wouldAddSystemLateFeeCount,
        wouldReverseInvalidSystemLateFeeCount,
        wouldRequireManualReviewCount,
        sampleReversalStudentId,
    };
}
export async function reconcileLateFeesForQuarter(term, year) {
    const t = term.trim();
    const y = Math.trunc(year);
    const { paymentDueDate } = await getFinanceQuarterDdlFromAcademicTerms(pool, t, y);
    const studentIds = await listStudentIdsWithPortalQuarterActivity(pool, t, y);
    const allFeeRows = await listSystemLateFeeRowsForQuarter(pool, t, y);
    const activeByStudent = new Map();
    for (const row of allFeeRows) {
        if (row.activeAmount <= 0)
            continue;
        const key = row.studentExternalId.trim();
        const arr = activeByStudent.get(key) ?? [];
        arr.push(row);
        activeByStudent.set(key, arr);
    }
    let insertedCount = 0;
    let reversedCount = 0;
    let protectedSettledCount = 0;
    let skippedCount = 0;
    let sampleReversal = null;
    const feeAmount = roundMoney(30);
    for (const studentId of studentIds) {
        const eligibility = await evaluateLateFeeEligibility(studentId, t, y, paymentDueDate);
        const activeFees = [...(activeByStudent.get(studentId) ?? [])].sort((a, b) => a.id - b.id);
        if (eligibility.eligible) {
            if (activeFees.length === 0) {
                await insertSystemLateFee(pool, {
                    studentExternalId: studentId,
                    term: t,
                    year: y,
                    amount: feeAmount,
                });
                insertedCount += 1;
            }
            else if (activeFees.length > 1) {
                let reversibleRemaining = roundMoney(Math.max(0, eligibility.lateFeeOutstanding - activeFees[0].activeAmount));
                for (const fee of activeFees.slice(1)) {
                    if (reversibleRemaining <= 0) {
                        protectedSettledCount += 1;
                        continue;
                    }
                    const reversalAmount = roundMoney(Math.min(fee.activeAmount, reversibleRemaining));
                    if (reversalAmount <= 0) {
                        protectedSettledCount += 1;
                        continue;
                    }
                    const reversalId = await insertSystemLateFeeReversal(pool, {
                        studentExternalId: studentId,
                        term: t,
                        year: y,
                        sourceAdjustmentId: fee.id,
                        amount: reversalAmount,
                        reason: "Removed duplicate active system late fee during reconciliation",
                    });
                    reversedCount += 1;
                    reversibleRemaining = roundMoney(Math.max(0, reversibleRemaining - reversalAmount));
                    if (sampleReversal == null) {
                        sampleReversal = {
                            studentId,
                            originalLateFeeAdjustmentId: fee.id,
                            reversalAdjustmentId: reversalId,
                        };
                    }
                }
            }
            else {
                skippedCount += 1;
            }
            continue;
        }
        if (activeFees.length === 0) {
            skippedCount += 1;
            continue;
        }
        let reversibleRemaining = shouldReverseActiveSystemLateFeesRegardlessOfLedger(eligibility)
            ? roundMoney(activeFees.reduce((sum, fee) => roundMoney(sum + Math.max(0, fee.activeAmount)), 0))
            : roundMoney(Math.max(0, eligibility.lateFeeOutstanding));
        for (const fee of activeFees) {
            if (reversibleRemaining <= 0) {
                protectedSettledCount += 1;
                continue;
            }
            const reversalAmount = roundMoney(Math.min(fee.activeAmount, reversibleRemaining));
            if (reversalAmount <= 0) {
                protectedSettledCount += 1;
                continue;
            }
            const reversalId = await insertSystemLateFeeReversal(pool, {
                studentExternalId: studentId,
                term: t,
                year: y,
                sourceAdjustmentId: fee.id,
                amount: reversalAmount,
                reason: "Payment due date reconciliation: late fee no longer valid",
            });
            reversedCount += 1;
            reversibleRemaining = roundMoney(Math.max(0, reversibleRemaining - reversalAmount));
            if (sampleReversal == null) {
                sampleReversal = {
                    studentId,
                    originalLateFeeAdjustmentId: fee.id,
                    reversalAdjustmentId: reversalId,
                };
            }
        }
    }
    return {
        ok: true,
        term: t,
        year: y,
        paymentDueDate,
        studentsScanned: studentIds.length,
        insertedCount,
        reversedCount,
        protectedSettledCount,
        skippedCount,
        sampleReversal,
    };
}
export async function putQuarterSettings(input) {
    void input.lateFeeEnabled;
    void input.lateFeeAmount;
    void input.updatedBy;
    const result = await setFinanceQuarterDdlOnAcademicTerms(pool, input.term, input.year, input.paymentDueDate);
    if (result === "no_column") {
        return {
            ok: false,
            message: "Payment DDL persistence is not yet enabled on academic terms.",
        };
    }
    if (result === "not_found") {
        return {
            ok: false,
            message: "No matching academic term row for this quarter. Create it under Academic Terms first.",
        };
    }
    const reconciliation = await reconcileLateFeesForQuarter(input.term, input.year);
    return { ok: true, reconciliation };
}
export function parseBalanceFilterParam(raw) {
    const s = (raw ?? "").trim().toLowerCase();
    if (s === "positive" ||
        s === "negative" ||
        s === "zero" ||
        s === "all") {
        return s;
    }
    return "all";
}
function matchesFinanceBalanceFilter(balance, filter) {
    const b = roundMoney(balance);
    if (filter === "all")
        return true;
    if (filter === "positive")
        return b > 0;
    if (filter === "negative")
        return b < 0;
    return b === 0;
}
/**
 * Merged quarter balance per student id: legacy `accounting` net + portal adjustments when
 * legacy rows exist; otherwise the same net as the portal ledger builder (tuition synthesis,
 * adjustments, and `portal_payments`).
 */
async function computeMergedFinanceQuarterBalancesForStudents(studentIds, term, year) {
    const t = term.trim();
    const y = Math.trunc(year);
    const out = new Map();
    const uniqueIds = [
        ...new Set(studentIds.map((s) => s.trim()).filter((s) => s !== "")),
    ];
    if (uniqueIds.length === 0) {
        return out;
    }
    const [legacyMap, adjMap, payMap] = await Promise.all([
        sumLegacyAccountingBalanceByStudentForQuarter(pool, t, y),
        sumPortalBillingAdjustmentsNetByStudentForQuarter(pool, t, y),
        sumPortalPaymentsByStudentForQuarter(pool, t, y),
    ]);
    const portalOnlyIds = uniqueIds.filter((id) => !legacyMap.has(id));
    const portalCtxByStudent = new Map();
    const PORTAL_CTX_CHUNK = 200;
    for (let i = 0; i < portalOnlyIds.length; i += PORTAL_CTX_CHUNK) {
        const chunk = portalOnlyIds.slice(i, i + PORTAL_CTX_CHUNK);
        const part = await batchLoadPortalTermBillingContextsForQuarter(pool, chunk, t, y);
        for (const [k, v] of part) {
            portalCtxByStudent.set(k, v);
        }
    }
    for (const id of uniqueIds) {
        if (legacyMap.has(id)) {
            const legacyNet = roundMoney(legacyMap.get(id) ?? 0);
            const adjNet = roundMoney(adjMap.get(id) ?? 0);
            out.set(id, roundMoney(legacyNet + adjNet));
            continue;
        }
        const ctx = portalCtxByStudent.get(id);
        if (ctx != null) {
            out.set(id, roundMoney(computePortalOnlyQuarterNetBalance(ctx)));
        }
        else {
            const adjNet = roundMoney(adjMap.get(id) ?? 0);
            const payNet = roundMoney(payMap.get(id) ?? 0);
            out.set(id, roundMoney(adjNet - payNet));
        }
    }
    return out;
}
/**
 * Paginated finance roster: one roster SQL (search + paging), one batched balance pass
 * (legacy aggregates, portal adjustment/payment sums, and batched portal billing contexts).
 */
export async function listAdminFinanceStudentsPaginated(term, year, query) {
    console.time("[admin finance students] total");
    const t = term.trim();
    const y = Math.trunc(year);
    const page = Math.max(1, Math.trunc(query.page));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize)));
    const offset = (page - 1) * pageSize;
    const searchTrimmed = query.search.trim();
    const balanceFilter = query.balanceFilter;
    try {
        if (balanceFilter === "all") {
            console.time("[admin finance students] students query");
            const [total, rawRows] = await Promise.all([
                countAdminFinanceRosterSearchOnly(pool, { searchTrimmed }),
                listAdminFinanceRosterPageSearchOnly(pool, {
                    searchTrimmed,
                    limit: pageSize,
                    offset,
                }),
            ]);
            console.timeEnd("[admin finance students] students query");
            console.time("[admin finance students] balance aggregate");
            const ids = rawRows.map((r) => r.studentId);
            const balMap = await computeMergedFinanceQuarterBalancesForStudents(ids, t, y);
            console.timeEnd("[admin finance students] balance aggregate");
            const items = rawRows.map((r) => ({
                studentId: r.studentId,
                name: r.name,
                balance: roundMoney(balMap.get(r.studentId) ?? 0),
            }));
            return { items, total, page, pageSize };
        }
        console.time("[admin finance students] students query");
        const allRows = await listAdminFinanceRosterAllSearchOnlyOrdered(pool, {
            searchTrimmed,
        });
        console.timeEnd("[admin finance students] students query");
        console.time("[admin finance students] balance aggregate");
        const allIds = allRows.map((r) => r.studentId);
        const balMap = await computeMergedFinanceQuarterBalancesForStudents(allIds, t, y);
        console.timeEnd("[admin finance students] balance aggregate");
        const filtered = allRows.filter((r) => matchesFinanceBalanceFilter(balMap.get(r.studentId) ?? 0, balanceFilter));
        const total = filtered.length;
        const slice = filtered.slice(offset, offset + pageSize);
        const items = slice.map((r) => ({
            studentId: r.studentId,
            name: r.name,
            balance: roundMoney(balMap.get(r.studentId) ?? 0),
        }));
        return { items, total, page, pageSize };
    }
    finally {
        console.timeEnd("[admin finance students] total");
    }
}
export async function getAdminFinanceQuarters(studentId) {
    const canonical = (await resolveCanonicalStudentExternalId(pool, studentId)) ?? studentId.trim();
    return getAccountingQuartersPayload(canonical);
}
export async function getAdminFinanceLedger(studentId, term, year) {
    const requested = studentId.trim();
    const canonical = (await resolveCanonicalStudentExternalId(pool, requested)) ?? requested;
    const payload = await getAccountingLedgerPayload(canonical, term.trim(), year);
    if (payload == null) {
        return null;
    }
    const presentation = await getAccountingLedgerPayload(canonical, term.trim(), year, {
        studentPortalLedgerPresentation: true,
        skipExpiredClinicalBookingReconciliation: true,
        skipLateFeeEvaluation: true,
    });
    const tuitionSnap = presentation == null
        ? null
        : computeTuitionBalanceSnapshot({
            requestedStudentId: requested,
            resolvedStudentId: canonical,
            term: presentation.term.trim() || term.trim(),
            year: presentation.year,
            rows: (presentation.rows ?? []),
        });
    console.log("[admin-ledger-summary]", {
        studentId: canonical,
        requestedStudentId: requested,
        term: payload.term,
        year: payload.year,
        totalCharges: payload.summary.totalCharges,
        totalPayments: payload.summary.totalPayments,
        balance: payload.summary.balance,
        tuitionPayFlowBalance: tuitionSnap?.tuitionBalanceDue ?? null,
    });
    return {
        ...payload,
        studentId: canonical,
        tuitionPayFlowSummary: tuitionSnap == null
            ? null
            : {
                tuitionCharges: tuitionSnap.tuitionCharges,
                lateFees: tuitionSnap.lateFees,
                tuitionPaymentsApplied: tuitionSnap.tuitionPayments,
                lateFeePaymentsApplied: tuitionSnap.lateFeePayments,
                tuitionBalanceDue: tuitionSnap.tuitionBalanceDue,
                tuitionChargeAmountDue: tuitionSnap.tuitionChargeAmountDue,
                lateFeeChargeAmountDue: tuitionSnap.lateFeeChargeAmountDue,
            },
    };
}
function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function parseCategory(raw) {
    if (raw === undefined || raw === null)
        return "tuition";
    if (typeof raw !== "string")
        return null;
    const s = raw.trim().toLowerCase();
    if (s === "")
        return "tuition";
    if (CHARGE_CATEGORIES.includes(s)) {
        return s;
    }
    return null;
}
export function validatePostChargeBody(raw) {
    if (raw == null || typeof raw !== "object") {
        return { ok: false, error: "Request body must be a JSON object." };
    }
    const o = raw;
    const studentId = typeof o.studentId === "string" ? o.studentId.trim() : "";
    const term = typeof o.term === "string" ? o.term.trim() : "";
    const yearRaw = o.year;
    const year = typeof yearRaw === "number"
        ? yearRaw
        : typeof yearRaw === "string"
            ? Number(yearRaw)
            : Number.NaN;
    const description = typeof o.description === "string" ? o.description.trim() : "";
    const amountRaw = o.amount;
    const amount = typeof amountRaw === "number"
        ? amountRaw
        : typeof amountRaw === "string"
            ? Number(amountRaw)
            : Number.NaN;
    if (studentId === "" || term === "" || !Number.isFinite(year)) {
        return {
            ok: false,
            error: "studentId, term, and year are required; year must be a finite number.",
        };
    }
    if (description === "") {
        return { ok: false, error: "description is required." };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, error: "amount must be a number greater than 0." };
    }
    const category = parseCategory(o.category);
    if (category == null) {
        return {
            ok: false,
            error: "category must be one of: fees, other, tuition, clinical, exam (or omit for tuition).",
        };
    }
    return {
        ok: true,
        data: {
            studentId,
            term,
            year: Math.trunc(year),
            description,
            amount: roundMoney(amount),
            category,
        },
    };
}
export function validatePostPaymentBody(raw) {
    if (raw == null || typeof raw !== "object") {
        return { ok: false, error: "Request body must be a JSON object." };
    }
    const o = raw;
    const studentId = typeof o.studentId === "string" ? o.studentId.trim() : "";
    const term = typeof o.term === "string" ? o.term.trim() : "";
    const yearRaw = o.year;
    const year = typeof yearRaw === "number"
        ? yearRaw
        : typeof yearRaw === "string"
            ? Number(yearRaw)
            : Number.NaN;
    const amountRaw = o.amount;
    const amount = typeof amountRaw === "number"
        ? amountRaw
        : typeof amountRaw === "string"
            ? Number(amountRaw)
            : Number.NaN;
    if (studentId === "" || term === "" || !Number.isFinite(year)) {
        return {
            ok: false,
            error: "studentId, term, and year are required; year must be a finite number.",
        };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, error: "amount must be a number greater than 0." };
    }
    let paidAt;
    if (o.paidAt === undefined || o.paidAt === null) {
        paidAt = todayIsoDate();
    }
    else if (typeof o.paidAt === "string" && o.paidAt.trim() !== "") {
        paidAt = o.paidAt.trim().slice(0, 10);
    }
    else {
        return {
            ok: false,
            error: "paidAt must be an ISO date string (YYYY-MM-DD) or omitted.",
        };
    }
    const method = o.method === undefined || o.method === null
        ? "admin"
        : typeof o.method === "string" && o.method.trim() !== ""
            ? o.method.trim()
            : null;
    if (method == null) {
        return { ok: false, error: "method must be a non-empty string or omitted." };
    }
    const description = o.description === undefined || o.description === null
        ? "Admin recorded payment"
        : typeof o.description === "string"
            ? o.description.trim() || "Admin recorded payment"
            : null;
    if (description == null) {
        return { ok: false, error: "description must be a string or omitted." };
    }
    return {
        ok: true,
        data: {
            studentId,
            term,
            year: Math.trunc(year),
            amount: roundMoney(amount),
            paidAt,
            method,
            description,
        },
    };
}
export async function postAdminFinanceCharge(input) {
    const canonical = (await resolveCanonicalStudentExternalId(pool, input.studentId)) ??
        input.studentId.trim();
    await insertPortalBillingAdjustment(pool, {
        studentExternalId: canonical,
        term: input.term,
        year: input.year,
        description: input.description,
        amount: input.amount,
        category: input.category ?? "tuition",
        adjustmentSource: "admin_manual_charge",
    });
}
export async function postAdminFinancePayment(input) {
    const canonical = (await resolveCanonicalStudentExternalId(pool, input.studentId)) ??
        input.studentId.trim();
    const baseDesc = (input.description ?? "Admin recorded payment").trim();
    const desc = baseDesc.startsWith("[admin_manual_payment]")
        ? baseDesc.slice(0, 255)
        : `[admin_manual_payment] ${baseDesc}`.slice(0, 255);
    await insertPortalPayment(pool, {
        studentExternalId: canonical,
        term: input.term,
        year: input.year,
        amount: input.amount,
        paidAt: input.paidAt ?? todayIsoDate(),
        method: input.method ?? "admin",
        description: desc,
    });
}
export function validatePutChargeBody(raw) {
    if (raw == null || typeof raw !== "object") {
        return { ok: false, error: "Request body must be a JSON object." };
    }
    const o = raw;
    const description = typeof o.description === "string" ? o.description.trim() : "";
    const amountRaw = o.amount;
    const amount = typeof amountRaw === "number"
        ? amountRaw
        : typeof amountRaw === "string"
            ? Number(amountRaw)
            : Number.NaN;
    const category = parseCategory(o.category);
    if (description === "") {
        return { ok: false, error: "description is required." };
    }
    if (!Number.isFinite(amount) || amount === 0) {
        return { ok: false, error: "amount must be a non-zero number." };
    }
    if (category == null) {
        return {
            ok: false,
            error: "category must be one of: fees, other, tuition, clinical, exam (or omit for tuition).",
        };
    }
    return {
        ok: true,
        data: {
            description,
            amount: roundMoney(amount),
            category,
        },
    };
}
export function validatePutPaymentBody(raw) {
    if (raw == null || typeof raw !== "object") {
        return { ok: false, error: "Request body must be a JSON object." };
    }
    const o = raw;
    const amountRaw = o.amount;
    const amount = typeof amountRaw === "number"
        ? amountRaw
        : typeof amountRaw === "string"
            ? Number(amountRaw)
            : Number.NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, error: "amount must be a number greater than 0." };
    }
    const paidAt = typeof o.paidAt === "string" && o.paidAt.trim() !== ""
        ? o.paidAt.trim().slice(0, 10)
        : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
        return { ok: false, error: "paidAt must be YYYY-MM-DD." };
    }
    const method = typeof o.method === "string" && o.method.trim() !== ""
        ? o.method.trim()
        : "";
    if (method === "") {
        return { ok: false, error: "method is required." };
    }
    let description;
    if (o.description === undefined || o.description === null) {
        description = null;
    }
    else if (typeof o.description === "string") {
        const s = o.description.trim();
        description = s === "" ? null : s;
    }
    else {
        return { ok: false, error: "description must be a string or null." };
    }
    return {
        ok: true,
        data: {
            amount: roundMoney(amount),
            paidAt,
            method,
            description,
        },
    };
}
export async function putAdminFinanceCharge(id, body) {
    try {
        await updateManualBillingAdjustment(pool, id, body);
    }
    catch (e) {
        if (e instanceof Error && e.message === "NOT_MANUAL_OR_MISSING") {
            const err = new Error("Charge not found or is not an editable manual adjustment.");
            err.statusCode = 400;
            throw err;
        }
        throw e;
    }
}
export async function deleteAdminFinanceCharge(id) {
    try {
        await deleteManualBillingAdjustment(pool, id);
    }
    catch (e) {
        if (e instanceof Error && e.message === "NOT_MANUAL_OR_MISSING") {
            const err = new Error("Charge not found or is not a deletable manual adjustment.");
            err.statusCode = 400;
            throw err;
        }
        throw e;
    }
}
export async function putAdminFinancePayment(id, body) {
    const row = await getPortalPaymentById(pool, id);
    if (row == null) {
        const err = new Error("Payment not found.");
        err.statusCode = 400;
        throw err;
    }
    await updatePortalPayment(pool, id, body);
}
export async function deleteAdminFinancePayment(id) {
    try {
        await deletePortalPayment(pool, id);
    }
    catch (e) {
        if (e instanceof Error && e.message === "MISSING_PAYMENT") {
            const err = new Error("Payment not found.");
            err.statusCode = 400;
            throw err;
        }
        throw e;
    }
}
export async function verifyManualChargeForStudentTerm(id, studentId, term, year) {
    const canonical = (await resolveCanonicalStudentExternalId(pool, studentId)) ?? studentId.trim();
    const row = await getBillingAdjustmentById(pool, id);
    if (row == null)
        return false;
    const src = String(row.adjustmentSource ?? "").trim().toLowerCase();
    if (src !== "manual" && src !== "admin_manual_charge")
        return false;
    return (row.studentExternalId.trim() === canonical &&
        row.term.trim().toLowerCase() === term.trim().toLowerCase() &&
        row.year === Math.trunc(year));
}
export async function verifyPaymentForStudentTerm(id, studentId, term, year) {
    const canonical = (await resolveCanonicalStudentExternalId(pool, studentId)) ?? studentId.trim();
    const row = await getPortalPaymentById(pool, id);
    if (row == null)
        return false;
    return (row.studentExternalId.trim() === canonical &&
        row.term.trim().toLowerCase() === term.trim().toLowerCase() &&
        row.year === Math.trunc(year));
}
export async function runLateFeeCheckForQuarter(term, year) {
    const t = term.trim();
    const y = Math.trunc(year);
    const result = await reconcileLateFeesForQuarter(t, y);
    return {
        ok: true,
        insertedCount: result.insertedCount,
        skippedCount: result.skippedCount + result.protectedSettledCount,
        message: result.reversedCount > 0
            ? `Reconciled late fees: inserted ${result.insertedCount}, reversed ${result.reversedCount}.`
            : undefined,
    };
}
//# sourceMappingURL=adminFinanceService.js.map