import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

type DbExec = Pick<Pool, "execute">;

export type ClinicalExamRequestDbRow = {
  id: number;
  student_id: string;
  exam_code: string;
  exam_name: string;
  term: string;
  year: number;
  status: string;
  assigned_exam_date: string | Date | null;
  assigned_exam_time: string | null;
  assigned_by: string | null;
  assigned_at: Date | string | null;
  notes: string | null;
  billing_adjustment_id: number | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function rowToPacket(r: RowDataPacket): ClinicalExamRequestDbRow {
  return {
    id: Math.trunc(Number(r.id)),
    student_id: String(r.student_id ?? "").trim(),
    exam_code: String(r.exam_code ?? "").trim(),
    exam_name: String(r.exam_name ?? "").trim(),
    term: String(r.term ?? "").trim(),
    year: Math.trunc(Number(r.year)),
    status: String(r.status ?? "").trim(),
    assigned_exam_date: r.assigned_exam_date ?? null,
    assigned_exam_time: r.assigned_exam_time != null ? String(r.assigned_exam_time) : null,
    assigned_by: r.assigned_by != null ? String(r.assigned_by).trim() : null,
    assigned_at: r.assigned_at ?? null,
    notes: r.notes != null ? String(r.notes) : null,
    billing_adjustment_id:
      r.billing_adjustment_id != null ? Math.trunc(Number(r.billing_adjustment_id)) : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function clinicalExamRequestHasActiveDuplicate(
  exec: DbExec,
  studentId: string,
  examCode: string,
): Promise<boolean> {
  const [rows] = await exec.execute<RowDataPacket[]>(
    `SELECT id
       FROM clinical_exam_requests
      WHERE student_id = ?
        AND exam_code = ?
        AND status IN ('requested', 'scheduled')
      LIMIT 1`,
    [studentId.trim(), examCode.trim().toUpperCase()],
  );
  return rows.length > 0;
}

export async function insertClinicalExamRequest(
  exec: DbExec,
  params: {
    studentId: string;
    examCode: string;
    examName: string;
    term: string;
    year: number;
    billingAdjustmentId: number;
  },
): Promise<number> {
  const [res] = await exec.execute<ResultSetHeader>(
    `INSERT INTO clinical_exam_requests
      (student_id, exam_code, exam_name, term, year, status,
       billing_adjustment_id, assigned_exam_date, assigned_exam_time,
       assigned_by, assigned_at, notes)
     VALUES (?, ?, ?, ?, ?, 'requested', ?, NULL, NULL, NULL, NULL, NULL)`,
    [
      params.studentId.trim(),
      params.examCode.trim().toUpperCase(),
      params.examName.trim(),
      params.term.trim(),
      Math.trunc(params.year),
      Math.trunc(params.billingAdjustmentId),
    ],
  );
  return Math.trunc(Number(res.insertId));
}

export async function listClinicalExamRequestsForStudent(
  exec: DbExec,
  studentId: string,
): Promise<ClinicalExamRequestDbRow[]> {
  const [rows] = await exec.execute<RowDataPacket[]>(
    `SELECT id, student_id, exam_code, exam_name, term, year, status,
            assigned_exam_date, assigned_exam_time, assigned_by, assigned_at,
            notes, billing_adjustment_id, created_at, updated_at
       FROM clinical_exam_requests
      WHERE student_id = ?
      ORDER BY created_at DESC`,
    [studentId.trim()],
  );
  return rows.map(rowToPacket);
}

export async function listClinicalExamRequestsForAdmin(
  exec: DbExec,
): Promise<ClinicalExamRequestDbRow[]> {
  const [rows] = await exec.execute<RowDataPacket[]>(
    `SELECT id, student_id, exam_code, exam_name, term, year, status,
            assigned_exam_date, assigned_exam_time, assigned_by, assigned_at,
            notes, billing_adjustment_id, created_at, updated_at
       FROM clinical_exam_requests
      ORDER BY created_at DESC`,
  );
  return rows.map(rowToPacket);
}

export async function getClinicalExamRequestById(
  exec: DbExec,
  id: number,
): Promise<ClinicalExamRequestDbRow | null> {
  const [rows] = await exec.execute<RowDataPacket[]>(
    `SELECT id, student_id, exam_code, exam_name, term, year, status,
            assigned_exam_date, assigned_exam_time, assigned_by, assigned_at,
            notes, billing_adjustment_id, created_at, updated_at
       FROM clinical_exam_requests
      WHERE id = ?
      LIMIT 1`,
    [Math.trunc(id)],
  );
  if (rows.length === 0) return null;
  return rowToPacket(rows[0]!);
}

export async function updateClinicalExamRequestFields(
  exec: DbExec,
  id: number,
  fields: {
    assignedExamDate: string | null;
    assignedExamTime: string | null;
    notes: string | null;
    status: string;
    assignedBy: string | null;
  },
): Promise<boolean> {
  const [res] = await exec.execute<ResultSetHeader>(
    `UPDATE clinical_exam_requests
        SET assigned_exam_date = ?,
            assigned_exam_time = ?,
            notes = ?,
            status = ?,
            assigned_by = ?,
            assigned_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [
      fields.assignedExamDate,
      fields.assignedExamTime,
      fields.notes,
      fields.status,
      fields.assignedBy,
      Math.trunc(id),
    ],
  );
  return res.affectedRows > 0;
}
