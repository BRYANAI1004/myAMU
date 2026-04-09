function mapFullRow(r) {
    const row = r;
    return {
        id: Number(row.id),
        student_external_id: String(row.student_external_id ?? "").trim(),
        course_code: String(row.course_code ?? "").trim(),
        term: String(row.term ?? "").trim(),
        year: Number(row.year),
        q1_rating: Number(row.q1_rating),
        q2_rating: Number(row.q2_rating),
        q3_rating: Number(row.q3_rating),
        q4_rating: Number(row.q4_rating),
        q5_rating: Number(row.q5_rating),
        overall_rating: Number(row.overall_rating),
        comment: row.comment == null ? null : String(row.comment).trim() || null,
        submitted_at: row.submitted_at instanceof Date
            ? row.submitted_at
            : new Date(String(row.submitted_at)),
        created_at: row.created_at instanceof Date
            ? row.created_at
            : new Date(String(row.created_at)),
        updated_at: row.updated_at instanceof Date
            ? row.updated_at
            : new Date(String(row.updated_at)),
    };
}
function mapKeyRow(r) {
    const row = r;
    return {
        course_code: String(row.course_code ?? "").trim(),
        term: String(row.term ?? "").trim(),
        year: Number(row.year),
        submitted_at: row.submitted_at instanceof Date
            ? row.submitted_at
            : new Date(String(row.submitted_at)),
    };
}
export async function createCourseFeedback(pool, input) {
    const [res] = await pool.query(`INSERT INTO course_feedback (
      student_external_id, course_code, term, year,
      q1_rating, q2_rating, q3_rating, q4_rating, q5_rating,
      overall_rating, comment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        input.studentExternalId.trim(),
        input.courseCode.trim(),
        input.term.trim(),
        input.year,
        input.q1Rating,
        input.q2Rating,
        input.q3Rating,
        input.q4Rating,
        input.q5Rating,
        input.overallRating,
        input.comment,
    ]);
    return res.insertId;
}
export async function findCourseFeedbackByStudentCourseTerm(pool, args) {
    const [rows] = await pool.query(`SELECT id, student_external_id, course_code, term, year,
            q1_rating, q2_rating, q3_rating, q4_rating, q5_rating,
            overall_rating, comment, submitted_at, created_at, updated_at
     FROM course_feedback
     WHERE student_external_id = ?
       AND course_code = ?
       AND term = ?
       AND year = ?
     LIMIT 1`, [
        args.studentExternalId.trim(),
        args.courseCode.trim(),
        args.term.trim(),
        args.year,
    ]);
    if (rows.length === 0)
        return null;
    return mapFullRow(rows[0]);
}
/** For merging feedback flags into GET /academics. */
export async function listCourseFeedbackSubmittedKeysForStudent(pool, studentExternalId) {
    const [rows] = await pool.query(`SELECT course_code, term, year, submitted_at
     FROM course_feedback
     WHERE student_external_id = ?
     ORDER BY year DESC, submitted_at DESC`, [studentExternalId.trim()]);
    return rows.map(mapKeyRow);
}
//# sourceMappingURL=courseFeedbackRepository.js.map