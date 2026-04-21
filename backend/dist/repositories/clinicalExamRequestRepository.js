function rowToPacket(r) {
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
    const [rows] = await exec.execute(`SELECT id, student_id, exam_code, exam_name, term, year, status,
            assigned_exam_date, assigned_exam_time, assigned_by, assigned_at,
            notes, billing_adjustment_id, created_at, updated_at
       FROM clinical_exam_requests
      WHERE student_id = ?
      ORDER BY created_at DESC`, [studentId.trim()]);
    return rows.map(rowToPacket);
}
export async function listClinicalExamRequestsForAdmin(exec) {
    const [rows] = await exec.execute(`SELECT id, student_id, exam_code, exam_name, term, year, status,
            assigned_exam_date, assigned_exam_time, assigned_by, assigned_at,
            notes, billing_adjustment_id, created_at, updated_at
       FROM clinical_exam_requests
      ORDER BY created_at DESC`);
    return rows.map(rowToPacket);
}
export async function getClinicalExamRequestById(exec, id) {
    const [rows] = await exec.execute(`SELECT id, student_id, exam_code, exam_name, term, year, status,
            assigned_exam_date, assigned_exam_time, assigned_by, assigned_at,
            notes, billing_adjustment_id, created_at, updated_at
       FROM clinical_exam_requests
      WHERE id = ?
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
            assigned_by = ?,
            assigned_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
        fields.assignedExamDate,
        fields.assignedExamTime,
        fields.notes,
        fields.status,
        fields.assignedBy,
        Math.trunc(id),
    ]);
    return res.affectedRows > 0;
}
//# sourceMappingURL=clinicalExamRequestRepository.js.map