function mapRow(r) {
    const row = r;
    return {
        id: Number(row.id),
        student_id: String(row.student_id ?? "").trim(),
        course_code: String(row.course_code ?? "").trim(),
        term: String(row.term ?? "").trim(),
        year: Number(row.year),
        rating: Number(row.rating),
        workload_rating: Number(row.workload_rating),
        difficulty_rating: Number(row.difficulty_rating),
        comments: row.comments == null ? null : String(row.comments).trim() || null,
        submitted_at: row.submitted_at instanceof Date
            ? row.submitted_at
            : new Date(String(row.submitted_at)),
    };
}
export async function listCourseFeedbackForStudent(pool, studentId) {
    const [rows] = await pool.query(`SELECT id, student_id, course_code, term, year,
            rating, workload_rating, difficulty_rating, comments, submitted_at
     FROM student_course_feedback
     WHERE TRIM(student_id) = TRIM(?)
     ORDER BY year DESC, submitted_at DESC`, [studentId]);
    return rows.map(mapRow);
}
export async function findCourseFeedbackDuplicate(pool, args) {
    const [rows] = await pool.query(`SELECT id
     FROM student_course_feedback
     WHERE TRIM(student_id) = TRIM(?)
       AND TRIM(course_code) = TRIM(?)
       AND year = ?
       AND LOWER(TRIM(term)) = LOWER(TRIM(?))
     LIMIT 1`, [args.studentId, args.courseCode, args.year, args.term]);
    return rows.length > 0;
}
export async function insertCourseFeedback(pool, input) {
    const [res] = await pool.query(`INSERT INTO student_course_feedback
      (student_id, course_code, term, year, rating, workload_rating, difficulty_rating, comments)
     VALUES (TRIM(?), TRIM(?), TRIM(?), ?, ?, ?, ?, ?)`, [
        input.studentId,
        input.courseCode,
        input.term,
        input.year,
        input.rating,
        input.workloadRating,
        input.difficultyRating,
        input.comments,
    ]);
    return res.insertId;
}
//# sourceMappingURL=studentCourseFeedbackRepository.js.map