import { pool } from "../lib/db.js";
import { resolveClinicalExam } from "../constants/clinicalExams.js";
import { insertPortalBillingAdjustment } from "../repositories/adminFinanceRepository.js";
import { clinicalExamRequestHasActiveDuplicate, getClinicalExamRequestById, insertClinicalExamRequest, listClinicalExamRequestsForAdmin, listClinicalExamRequestsForStudent, updateClinicalExamRequestFields, } from "../repositories/clinicalExamRequestRepository.js";
const CLINICAL_EXAM_REGISTRATION_FEE_USD = 50;
const ASSIGNABLE_STATUSES = new Set([
    "requested",
    "scheduled",
    "completed",
    "cancelled",
]);
function roundMoney(n) {
    return Math.round(n * 100) / 100;
}
function termYearLabel(term, year) {
    const t = term.trim();
    const cap = t.length > 0 ? t[0].toUpperCase() + t.slice(1).toLowerCase() : t;
    return `${cap} ${Math.trunc(year)}`;
}
function buildExamRegistrationBillingDescription(term, year, examCode, examName) {
    return `Clinical exam registration — ${termYearLabel(term, year)} · ${examCode} · ${examName}`;
}
function formatSqlDateOnly(v) {
    if (v == null)
        return null;
    if (v instanceof Date) {
        return v.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    if (s === "")
        return null;
    return s.length >= 10 ? s.slice(0, 10) : s;
}
function formatSqlTimeHm(v) {
    if (v == null)
        return null;
    if (v instanceof Date) {
        const hh = String(v.getUTCHours()).padStart(2, "0");
        const mm = String(v.getUTCMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    }
    const s = String(v).trim();
    if (s === "")
        return null;
    const m = s.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
    return m ? m[1] : s;
}
function formatSqlDateTimeIso(v) {
    if (v == null)
        return null;
    if (v instanceof Date)
        return v.toISOString();
    const s = String(v).trim();
    return s === "" ? null : s;
}
function rowToApi(r) {
    return {
        id: r.id,
        studentId: r.student_id,
        examCode: r.exam_code,
        examName: r.exam_name,
        term: r.term,
        year: r.year,
        status: r.status,
        assignedExamDate: formatSqlDateOnly(r.assigned_exam_date),
        assignedExamTime: formatSqlTimeHm(r.assigned_exam_time),
        assignedBy: r.assigned_by,
        assignedAt: formatSqlDateTimeIso(r.assigned_at),
        notes: r.notes,
        billingAdjustmentId: r.billing_adjustment_id,
        registrationFeeUsd: CLINICAL_EXAM_REGISTRATION_FEE_USD,
        createdAt: formatSqlDateTimeIso(r.created_at) ?? "",
        updatedAt: formatSqlDateTimeIso(r.updated_at) ?? "",
    };
}
export async function createStudentClinicalExamRequest(studentId, examCodeRaw, termRaw, yearRaw) {
    const sid = studentId.trim();
    if (sid === "") {
        return { ok: false, status: 400, error: "studentId is required." };
    }
    const exam = resolveClinicalExam(examCodeRaw);
    if (!exam) {
        return { ok: false, status: 400, error: "Invalid examCode." };
    }
    const term = termRaw.trim();
    if (term === "") {
        return { ok: false, status: 400, error: "term is required." };
    }
    const year = Math.trunc(yearRaw);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
        return { ok: false, status: 400, error: "year must be a valid number." };
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const dup = await clinicalExamRequestHasActiveDuplicate(conn, sid, exam.code);
        if (dup) {
            await conn.rollback();
            return {
                ok: false,
                status: 409,
                error: "You already have an active exam request (requested or scheduled) for this exam.",
            };
        }
        const amount = roundMoney(CLINICAL_EXAM_REGISTRATION_FEE_USD);
        const description = buildExamRegistrationBillingDescription(term, year, exam.code, exam.name);
        const billingAdjustmentId = await insertPortalBillingAdjustment(conn, {
            studentExternalId: sid,
            term,
            year,
            description,
            amount,
            category: "clinical",
            adjustmentSource: "system_clinical",
        });
        const requestId = await insertClinicalExamRequest(conn, {
            studentId: sid,
            examCode: exam.code,
            examName: exam.name,
            term,
            year,
            billingAdjustmentId,
        });
        await conn.commit();
        const row = await getClinicalExamRequestById(pool, requestId);
        if (!row) {
            return { ok: false, status: 500, error: "Request created but could not be reloaded." };
        }
        return { ok: true, request: rowToApi(row) };
    }
    catch (e) {
        await conn.rollback();
        console.error("[clinical exam request] create failed:", e);
        return { ok: false, status: 500, error: "Failed to create exam request." };
    }
    finally {
        conn.release();
    }
}
export async function listStudentClinicalExamRequestsApi(studentId) {
    const rows = await listClinicalExamRequestsForStudent(pool, studentId);
    return rows.map(rowToApi);
}
export async function listAdminClinicalExamRequestsApi() {
    const rows = await listClinicalExamRequestsForAdmin(pool);
    return rows.map(rowToApi);
}
export async function assignClinicalExamRequest(id, patch, assignedBy) {
    const existing = await getClinicalExamRequestById(pool, id);
    if (!existing) {
        return { ok: false, status: 404, error: "Exam request not found." };
    }
    let assignedExamDate = formatSqlDateOnly(existing.assigned_exam_date) ?? null;
    if (patch.assignedExamDate !== undefined) {
        const v = patch.assignedExamDate;
        if (v === null)
            assignedExamDate = null;
        else if (typeof v === "string") {
            const t = v.trim();
            assignedExamDate = t === "" ? null : t.slice(0, 10);
        }
        else {
            return { ok: false, status: 400, error: "assignedExamDate must be a string or null." };
        }
    }
    let assignedExamTime = formatSqlTimeHm(existing.assigned_exam_time) ?? null;
    if (patch.assignedExamTime !== undefined) {
        const v = patch.assignedExamTime;
        if (v === null)
            assignedExamTime = null;
        else if (typeof v === "string") {
            const t = v.trim();
            assignedExamTime = t === "" ? null : t;
        }
        else {
            return { ok: false, status: 400, error: "assignedExamTime must be a string or null." };
        }
    }
    let notes = existing.notes ?? null;
    if (patch.notes !== undefined) {
        notes = patch.notes.trim() === "" ? null : patch.notes.trim();
    }
    let status = existing.status;
    if (patch.status !== undefined) {
        const s = patch.status.trim().toLowerCase();
        if (!ASSIGNABLE_STATUSES.has(s)) {
            return { ok: false, status: 400, error: "Invalid status." };
        }
        status = s;
    }
    const assignedByFinal = assignedBy != null && assignedBy.trim() !== ""
        ? assignedBy.trim()
        : existing.assigned_by ?? null;
    const ok = await updateClinicalExamRequestFields(pool, id, {
        assignedExamDate,
        assignedExamTime,
        notes,
        status,
        assignedBy: assignedByFinal,
    });
    if (!ok) {
        return { ok: false, status: 500, error: "Failed to update exam request." };
    }
    const row = await getClinicalExamRequestById(pool, id);
    if (!row) {
        return { ok: false, status: 500, error: "Updated row could not be reloaded." };
    }
    return { ok: true, request: rowToApi(row) };
}
//# sourceMappingURL=clinicalExamRequestService.js.map