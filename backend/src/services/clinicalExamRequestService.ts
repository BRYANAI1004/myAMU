import { pool } from "../lib/db.js";
import { resolveClinicalExam } from "../constants/clinicalExams.js";
import { insertPortalBillingAdjustment } from "../repositories/adminFinanceRepository.js";
import {
  clinicalExamRequestHasActiveDuplicate,
  getClinicalExamRequestById,
  insertClinicalExamRequest,
  listClinicalExamRequestsForAdmin,
  listClinicalExamRequestsForStudent,
  upsertClinicalExamMarkByPrefix,
  updateClinicalExamRequestFields,
  voidClinicalExamBillingAdjustmentById,
  type ClinicalExamRequestDbRow,
} from "../repositories/clinicalExamRequestRepository.js";

const CLINICAL_EXAM_REGISTRATION_FEE_USD = 50;

const ASSIGNABLE_STATUSES = new Set([
  "requested",
  "scheduled",
  "completed",
  "cancelled",
]);
const ASSIGNABLE_GRADES = new Set(["", "P", "F"]);

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function termYearLabel(term: string, year: number): string {
  const t = term.trim();
  const cap = t.length > 0 ? t[0]!.toUpperCase() + t.slice(1).toLowerCase() : t;
  return `${cap} ${Math.trunc(year)}`;
}

function buildExamRegistrationBillingDescription(
  term: string,
  year: number,
  examCode: string,
  examName: string,
): string {
  return `Clinical exam registration — ${termYearLabel(term, year)} · ${examCode} · ${examName}`;
}

function formatSqlDateOnly(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (s === "") return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatSqlTimeHm(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const hh = String(v.getUTCHours()).padStart(2, "0");
    const mm = String(v.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const s = String(v).trim();
  if (s === "") return null;
  const m = s.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
  return m ? m[1]! : s;
}

function formatSqlDateTimeIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  return s === "" ? null : s;
}

export type ClinicalExamRequestApi = {
  id: number;
  studentId: string;
  studentName: string | null;
  examCode: string;
  examName: string;
  term: string;
  year: number;
  status: string;
  assignedExamDate: string | null;
  assignedExamTime: string | null;
  assignedBy: string | null;
  assignedAt: string | null;
  notes: string | null;
  billingAdjustmentId: number | null;
  registrationFeeUsd: number;
  createdAt: string;
  updatedAt: string;
};

function rowToApi(r: ClinicalExamRequestDbRow): ClinicalExamRequestApi {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
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

export async function createStudentClinicalExamRequest(
  studentId: string,
  examCodeRaw: string,
  termRaw: string,
  yearRaw: number,
): Promise<
  | { ok: true; request: ClinicalExamRequestApi }
  | { ok: false; status: number; error: string }
> {
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
        error:
          "You already have an active exam request (requested or scheduled) for this exam.",
      };
    }

    const amount = roundMoney(CLINICAL_EXAM_REGISTRATION_FEE_USD);
    const description = buildExamRegistrationBillingDescription(
      term,
      year,
      exam.code,
      exam.name,
    );

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
  } catch (e) {
    await conn.rollback();
    console.error("[clinical exam request] create failed:", e);
    return { ok: false, status: 500, error: "Failed to create exam request." };
  } finally {
    conn.release();
  }
}

export async function listStudentClinicalExamRequestsApi(
  studentId: string,
): Promise<ClinicalExamRequestApi[]> {
  const rows = await listClinicalExamRequestsForStudent(pool, studentId);
  return rows.map(rowToApi);
}

export async function listAdminClinicalExamRequestsApi(): Promise<ClinicalExamRequestApi[]> {
  const rows = await listClinicalExamRequestsForAdmin(pool);
  return rows.map(rowToApi);
}

export type ClinicalExamAssignPatch = {
  assignedExamDate?: string | null;
  assignedExamTime?: string | null;
  notes?: string;
  status?: string;
  grade?: string;
  term?: string;
  year?: number;
};

export async function assignClinicalExamRequest(
  id: number,
  patch: ClinicalExamAssignPatch,
  assignedBy: string | null,
): Promise<
  | { ok: true; request: ClinicalExamRequestApi }
  | { ok: false; status: number; error: string }
> {
  const existing = await getClinicalExamRequestById(pool, id);
  if (!existing) {
    return { ok: false, status: 404, error: "Exam request not found." };
  }

  let assignedExamDate =
    formatSqlDateOnly(existing.assigned_exam_date) ?? null;
  if (patch.assignedExamDate !== undefined) {
    const v = patch.assignedExamDate;
    if (v === null) assignedExamDate = null;
    else if (typeof v === "string") {
      const t = v.trim();
      assignedExamDate = t === "" ? null : t.slice(0, 10);
    } else {
      return { ok: false, status: 400, error: "assignedExamDate must be a string or null." };
    }
  }

  let assignedExamTime = formatSqlTimeHm(existing.assigned_exam_time) ?? null;
  if (patch.assignedExamTime !== undefined) {
    const v = patch.assignedExamTime;
    if (v === null) assignedExamTime = null;
    else if (typeof v === "string") {
      const t = v.trim();
      assignedExamTime = t === "" ? null : t;
    } else {
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

  let grade = "";
  if (patch.grade !== undefined) {
    const g = patch.grade.trim().toUpperCase();
    if (!ASSIGNABLE_GRADES.has(g)) {
      return { ok: false, status: 400, error: "Invalid grade." };
    }
    grade = g;
  }

  let term = existing.term;
  if (patch.term !== undefined) {
    const t = patch.term.trim();
    if (t === "") return { ok: false, status: 400, error: "term is required." };
    term = t;
  }

  let year = Math.trunc(existing.year);
  if (patch.year !== undefined) {
    const y = Math.trunc(Number(patch.year));
    if (!Number.isFinite(y) || y < 1900 || y > 2100) {
      return { ok: false, status: 400, error: "year must be a valid number." };
    }
    year = y;
  }

  if (status === "cancelled") {
    assignedExamDate = null;
    assignedExamTime = null;
  }

  const assignedByFinal =
    assignedBy != null && assignedBy.trim() !== ""
      ? assignedBy.trim()
      : existing.assigned_by ?? null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ok = await updateClinicalExamRequestFields(conn, id, {
      assignedExamDate,
      assignedExamTime,
      notes,
      status,
      term,
      year,
      assignedBy: assignedByFinal,
    });
    if (!ok) {
      await conn.rollback();
      return { ok: false, status: 500, error: "Failed to update exam request." };
    }

    if (status === "cancelled" && existing.billing_adjustment_id != null) {
      await voidClinicalExamBillingAdjustmentById(conn, {
        billingAdjustmentId: existing.billing_adjustment_id,
        studentId: existing.student_id,
        term: existing.term,
        year: existing.year,
      });
    }

    if (grade === "P" || grade === "F") {
      await upsertClinicalExamMarkByPrefix(conn, {
        studentId: existing.student_id,
        examCode: existing.exam_code,
        examName: existing.exam_name,
        grade,
        term,
        year,
      });
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    console.error("[clinical exam request] assign failed:", e);
    return { ok: false, status: 500, error: "Failed to update exam request." };
  } finally {
    conn.release();
  }

  const row = await getClinicalExamRequestById(pool, id);
  if (!row) {
    return { ok: false, status: 500, error: "Updated row could not be reloaded." };
  }
  return { ok: true, request: rowToApi(row) };
}
