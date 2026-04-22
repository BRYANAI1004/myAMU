function rowToPacket(r) {
    return {
        id: Math.trunc(Number(r.id)),
        student_id: String(r.student_id ?? "").trim(),
        student_name: r.student_name != null ? String(r.student_name).trim() : null,
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
        billing_adjustment_id: r.billing_adjustment_id != null ? Math.trunc(Number(r.billing_adjustment_id)) : null,
        created_at: r.created_at,
        updated_at: r.updated_at,
    };
}
export async function clinicalExamRequestHasActiveDuplicate(exec, studentId, examCode) {
    const [rows] = await exec.execute(`SELECT id
       FROM clinical_exam_requests
      WHERE student_id = ?
        AND exam_code = ?
        AND status IN ('requested', 'scheduled')
      LIMIT 1`, [studentId.trim(), examCode.trim().toUpperCase()]);
    return rows.length > 0;
}
export async function insertClinicalExamRequest(exec, params) {
    const [res] = await exec.execute(`INSERT INTO clinical_exam_requests
      (student_id, exam_code, exam_name, term, year, status,
       billing_adjustment_id, assigned_exam_date, assigned_exam_time,
       assigned_by, assigned_at, notes)
     VALUES (?, ?, ?, ?, ?, 'requested', ?, NULL, NULL, NULL, NULL, NULL)`, [
        params.studentId.trim(),
        params.examCode.trim().toUpperCase(),
        params.examName.trim(),
        params.term.trim(),
        Math.trunc(params.year),
        Math.trunc(params.billingAdjustmentId),
    ]);
    return Math.trunc(Number(res.insertId));
}
export async function listClinicalExamRequestsForStudent(exec, studentId) {
    const [rows] = await exec.execute(`SELECT r.id,
            r.student_id,
            NULL AS student_name,
            r.exam_code,
            r.exam_name,
            r.term,
            r.year,
            r.status,
            r.assigned_exam_date,
            r.assigned_exam_time,
            r.assigned_by,
            r.assigned_at,
            r.notes,
            r.billing_adjustment_id,
            r.created_at,
            r.updated_at
       FROM clinical_exam_requests r
      WHERE student_id = ?
      ORDER BY created_at DESC`, [studentId.trim()]);
    return rows.map(rowToPacket);
}
export async function listClinicalExamRequestsForAdmin(exec) {
    const [rows] = await exec.execute(`SELECT r.id,
            r.student_id,
            COALESCE(
              NULLIF(TRIM(s.name), ''),
              NULLIF(TRIM(ps.full_name), ''),
              r.student_id
            ) AS student_name,
            r.exam_code,
            r.exam_name,
            r.term,
            r.year,
            r.status,
            r.assigned_exam_date,
            r.assigned_exam_time,
            r.assigned_by,
            r.assigned_at,
            r.notes,
            r.billing_adjustment_id,
            r.created_at,
            r.updated_at
       FROM clinical_exam_requests r
       LEFT JOIN students s
         ON TRIM(s.id) = TRIM(r.student_id)
       LEFT JOIN portal_students ps
         ON ps.student_external_id = TRIM(r.student_id)
      ORDER BY r.created_at DESC`);
    return rows.map(rowToPacket);
}
export async function getClinicalExamRequestById(exec, id) {
    const [rows] = await exec.execute(`SELECT r.id,
            r.student_id,
            COALESCE(
              NULLIF(TRIM(s.name), ''),
              NULLIF(TRIM(ps.full_name), ''),
              r.student_id
            ) AS student_name,
            r.exam_code,
            r.exam_name,
            r.term,
            r.year,
            r.status,
            r.assigned_exam_date,
            r.assigned_exam_time,
            r.assigned_by,
            r.assigned_at,
            r.notes,
            r.billing_adjustment_id,
            r.created_at,
            r.updated_at
       FROM clinical_exam_requests r
       LEFT JOIN students s
         ON TRIM(s.id) = TRIM(r.student_id)
       LEFT JOIN portal_students ps
         ON ps.student_external_id = TRIM(r.student_id)
      WHERE r.id = ?
      LIMIT 1`, [Math.trunc(id)]);
    if (rows.length === 0)
        return null;
    return rowToPacket(rows[0]);
}
export async function updateClinicalExamRequestFields(exec, id, fields) {
    const [res] = await exec.execute(`UPDATE clinical_exam_requests
        SET assigned_exam_date = ?,
            assigned_exam_time = ?,
            notes = ?,
            status = ?,
            term = ?,
            year = ?,
            assigned_by = ?,
            assigned_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
        fields.assignedExamDate,
        fields.assignedExamTime,
        fields.notes,
        fields.status,
        fields.term.trim(),
        Math.trunc(fields.year),
        fields.assignedBy,
        Math.trunc(id),
    ]);
    return res.affectedRows > 0;
}
async function resolveStudentNameForMarks(exec, studentId) {
    const sid = studentId.trim();
    const [legacyRows] = await exec.query(`SELECT TRIM(name) AS name
       FROM students
      WHERE TRIM(id) = TRIM(?)
      LIMIT 1`, [sid]);
    if (legacyRows.length > 0) {
        const name = String(legacyRows[0].name ?? "").trim();
        if (name !== "")
            return name;
    }
    const [portalRows] = await exec.query(`SELECT TRIM(full_name) AS name
       FROM portal_students
      WHERE student_external_id = TRIM(?)
      LIMIT 1`, [sid]);
    if (portalRows.length > 0) {
        const name = String(portalRows[0].name ?? "").trim();
        if (name !== "")
            return name;
    }
    return null;
}
export async function voidClinicalExamBillingAdjustmentById(exec, params) {
    const [res] = await exec.execute(`UPDATE portal_billing_adjustments
        SET amount = 0,
            description = LEFT(
              CONCAT(TRIM(description), ' [voided: clinical exam request cancelled]'),
              255
            )
      WHERE id = ?
        AND adjustment_source = 'system_clinical'
        AND category = 'clinical'
        AND TRIM(student_external_id) = TRIM(?)
        AND LOWER(TRIM(term)) = LOWER(TRIM(?))
        AND year = ?
        AND amount <> 0`, [
        Math.trunc(params.billingAdjustmentId),
        params.studentId.trim(),
        params.term.trim(),
        Math.trunc(params.year),
    ]);
    return Math.trunc(Number(res.affectedRows ?? 0)) > 0;
}
async function findLatestMarksSeqByExamPrefix(exec, studentId, examCodePrefix) {
    const [rows] = await exec.query(`SELECT seqNumber AS seq
       FROM marks
      WHERE TRIM(id) = TRIM(?)
        AND UPPER(TRIM(code)) LIKE CONCAT(UPPER(TRIM(?)), '%')
      ORDER BY seqNumber DESC
      LIMIT 1`, [studentId.trim(), examCodePrefix.trim()]);
    if (rows.length === 0)
        return null;
    const seq = Number(rows[0].seq);
    return Number.isFinite(seq) ? Math.trunc(seq) : null;
}
function gradeToLegacyNumeric(grade) {
    return grade === "P" ? 1 : 0;
}
export async function upsertClinicalExamMarkByPrefix(exec, params) {
    const seq = await findLatestMarksSeqByExamPrefix(exec, params.studentId, params.examCode);
    const grade2 = gradeToLegacyNumeric(params.grade);
    if (seq != null) {
        await exec.execute(`UPDATE marks
          SET code = ?,
              course_title = ?,
              grade = ?,
              grade2 = ?,
              term = ?,
              year = ?
        WHERE seqNumber = ?`, [
            params.examCode.trim().toUpperCase(),
            params.examName.trim(),
            params.grade,
            grade2,
            params.term.trim(),
            Math.trunc(params.year),
            seq,
        ]);
        return;
    }
    const studentName = await resolveStudentNameForMarks(exec, params.studentId);
    if (studentName == null) {
        throw new Error("Student not found for marks insert.");
    }
    await exec.execute(`INSERT INTO marks (
      name, id, regis, code, grade, grade2, course_title, units,
      days, time_from, time_to, instructor, term, year, language, indie_study
    ) VALUES (?, ?, 0, ?, ?, ?, ?, 0, '', '00:00:00', '00:00:00', '', ?, ?, 'English', '')`, [
        studentName,
        params.studentId.trim(),
        params.examCode.trim().toUpperCase(),
        params.grade,
        grade2,
        params.examName.trim(),
        params.term.trim(),
        Math.trunc(params.year),
    ]);
}
//# sourceMappingURL=clinicalExamRequestRepository.js.map