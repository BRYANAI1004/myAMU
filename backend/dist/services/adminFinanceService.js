import { pool } from "../lib/db.js";
import { academicTermsPaymentDueDateColumnExists, deleteManualBillingAdjustment, deletePortalPayment, getBillingAdjustmentById, getFinanceQuarterDdlFromAcademicTerms, getPortalPaymentById, hasSystemLateFeeForQuarter, insertPortalBillingAdjustment, insertPortalPayment, insertSystemLateFee, listAdminFinanceRosterPage, countAdminFinanceRosterPage, listGlobalFinanceQuarters, listStudentIdsWithPortalQuarterActivity, setFinanceQuarterDdlOnAcademicTerms, updateManualBillingAdjustment, updatePortalPayment, } from "../repositories/adminFinanceRepository.js";
import { loadLegacyAccountingRows } from "../repositories/studentLegacyAccountRepository.js";
import { getAccountingLedgerPayload, getAccountingQuartersPayload, } from "./studentLedgerService.js";
import { isPastSchoolLocalDueDate } from "../lib/schoolLocalDate.js";
const CHARGE_CATEGORIES = [
    "fees",
    "other",
    "tuition",
    "clinical",
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
    return { ok: true };
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
/**
 * Paginated finance roster: search and balance filters run in SQL; balances are aggregated
 * in `quarter_bal` (no per-student queries).
 */
export async function listAdminFinanceStudentsPaginated(term, year, query) {
    const t = term.trim();
    const y = Math.trunc(year);
    const page = Math.max(1, Math.trunc(query.page));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize)));
    const offset = (page - 1) * pageSize;
    const searchTrimmed = query.search.trim();
    const [total, rawRows] = await Promise.all([
        countAdminFinanceRosterPage(pool, {
            term: t,
            year: y,
            searchTrimmed,
            balanceFilter: query.balanceFilter,
        }),
        listAdminFinanceRosterPage(pool, {
            term: t,
            year: y,
            searchTrimmed,
            balanceFilter: query.balanceFilter,
            limit: pageSize,
            offset,
        }),
    ]);
    const items = rawRows.map((r) => ({
        studentId: r.studentId,
        name: r.name,
        balance: roundMoney(r.balance),
    }));
    return { items, total, page, pageSize };
}
export async function getAdminFinanceQuarters(studentId) {
    return getAccountingQuartersPayload(studentId);
}
export async function getAdminFinanceLedger(studentId, term, year) {
    return getAccountingLedgerPayload(studentId, term.trim(), year);
}
function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function parseCategory(raw) {
    if (raw === undefined || raw === null)
        return "fees";
    if (typeof raw !== "string")
        return null;
    const s = raw.trim().toLowerCase();
    if (s === "")
        return "fees";
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
            error: "category must be one of: fees, other, tuition, clinical (or omit for fees).",
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
    await insertPortalBillingAdjustment(pool, {
        studentExternalId: input.studentId,
        term: input.term,
        year: input.year,
        description: input.description,
        amount: input.amount,
        category: input.category ?? "fees",
        adjustmentSource: "manual",
    });
}
export async function postAdminFinancePayment(input) {
    await insertPortalPayment(pool, {
        studentExternalId: input.studentId,
        term: input.term,
        year: input.year,
        amount: input.amount,
        paidAt: input.paidAt ?? todayIsoDate(),
        method: input.method ?? "admin",
        description: input.description ?? "Admin recorded payment",
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
            error: "category must be one of: fees, other, tuition, clinical (or omit for fees).",
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
    const row = await getBillingAdjustmentById(pool, id);
    if (row == null)
        return false;
    if (row.adjustmentSource !== "manual")
        return false;
    return (row.studentExternalId === studentId.trim() &&
        row.term.trim().toLowerCase() === term.trim().toLowerCase() &&
        row.year === Math.trunc(year));
}
export async function verifyPaymentForStudentTerm(id, studentId, term, year) {
    const row = await getPortalPaymentById(pool, id);
    if (row == null)
        return false;
    return (row.studentExternalId === studentId.trim() &&
        row.term.trim().toLowerCase() === term.trim().toLowerCase() &&
        row.year === Math.trunc(year));
}
export async function runLateFeeCheckForQuarter(term, year) {
    const t = term.trim();
    const y = Math.trunc(year);
    const { paymentDueDate } = await getFinanceQuarterDdlFromAcademicTerms(pool, t, y);
    if (paymentDueDate == null) {
        return {
            ok: true,
            insertedCount: 0,
            skippedCount: 0,
            message: "No payment due date configured for this quarter; nothing to do.",
        };
    }
    if (!isPastSchoolLocalDueDate(paymentDueDate)) {
        return {
            ok: true,
            insertedCount: 0,
            skippedCount: 0,
            message: "Payment due date has not passed yet; no late fees applied.",
        };
    }
    const feeAmount = roundMoney(30);
    const studentIds = await listStudentIdsWithPortalQuarterActivity(pool, t, y);
    let insertedCount = 0;
    let skippedCount = 0;
    for (const studentId of studentIds) {
        const legacy = await loadLegacyAccountingRows(pool, studentId, t, y);
        if (legacy.length > 0) {
            skippedCount += 1;
            continue;
        }
        const already = await hasSystemLateFeeForQuarter(pool, studentId, t, y);
        if (already) {
            skippedCount += 1;
            continue;
        }
        const ledger = await getAccountingLedgerPayload(studentId, t, y);
        const balance = ledger?.summary.balance ?? 0;
        if (balance <= 0) {
            skippedCount += 1;
            continue;
        }
        await insertSystemLateFee(pool, {
            studentExternalId: studentId,
            term: t,
            year: y,
            amount: feeAmount,
        });
        insertedCount += 1;
    }
    return { ok: true, insertedCount, skippedCount };
}
//# sourceMappingURL=adminFinanceService.js.map