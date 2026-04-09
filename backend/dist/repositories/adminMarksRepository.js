function logAdminMarksStageFailure(stage, err) {
    const o = err;
    const dbMsg = o?.sqlMessage ?? o?.message ?? String(err);
    console.error(`[admin-marks] ${stage} failed:`, dbMsg, o?.code != null ? `(code=${o.code})` : "");
}
async function findLatestMarksSeq(pool, input) {
    const [rows] = await pool.query(`SELECT m.seqNumber AS seq
     FROM marks m
     WHERE TRIM(m.id) = TRIM(?)
       AND TRIM(m.code) = TRIM(?)
       AND LOWER(TRIM(m.term)) = LOWER(TRIM(?))
       AND m.year = ?
     ORDER BY m.seqNumber DESC
     LIMIT 1`, [
        input.studentId.trim(),
        input.courseCode.trim(),
        input.legacyTerm.trim(),
        input.year,
    ]);
    if (rows.length === 0)
        return null;
    const seq = Number(rows[0].seq);
    return Number.isFinite(seq) ? seq : null;
}
async function resolveStudentNameForMarks(pool, studentId) {
    const sid = studentId.trim();
    const [fromStudents] = await pool.query(`SELECT TRIM(name) AS name FROM students WHERE TRIM(id) = TRIM(?) LIMIT 1`, [sid]);
    if (fromStudents.length > 0) {
        const n = String(fromStudents[0].name ?? "").trim();
        if (n !== "")
            return n;
    }
    const [fromPortal] = await pool.query(`SELECT TRIM(full_name) AS name
     FROM portal_students
     WHERE TRIM(student_external_id) = TRIM(?)
     LIMIT 1`, [sid]);
    if (fromPortal.length > 0) {
        const n = String(fromPortal[0].name ?? "").trim();
        if (n !== "")
            return n;
    }
    return null;
}
async function resolveCourseTitleAndUnits(pool, courseCode) {
    const code = courseCode.trim();
    const [rows] = await pool.query(`SELECT TRIM(title) AS title, units
     FROM portal_courses
     WHERE TRIM(course_code) = TRIM(?)
     LIMIT 1`, [code]);
    if (rows.length === 0)
        return null;
    const r = rows[0];
    const title = String(r.title ?? "").trim();
    const unitsRaw = Number(r.units);
    const units = Number.isFinite(unitsRaw) ? unitsRaw : 0;
    return { title: title === "" ? code : title, units };
}
/**
 * Updates or inserts one legacy `marks` row for student + course + term + year.
 * Does not touch `portal_enrollments`.
 */
export async function upsertMarkGrade(pool, input) {
    const grade2 = input.grade2Numeric != null && Number.isFinite(input.grade2Numeric)
        ? input.grade2Numeric
        : 0;
    let seq;
    try {
        seq = await findLatestMarksSeq(pool, input);
    }
    catch (err) {
        logAdminMarksStageFailure("latest-seq lookup", err);
        throw err;
    }
    if (seq != null) {
        try {
            await pool.query(`UPDATE marks SET grade = ?, grade2 = ? WHERE seqNumber = ?`, [input.grade.trim(), grade2, seq]);
        }
        catch (err) {
            logAdminMarksStageFailure("marks update", err);
            throw err;
        }
        return;
    }
    let name;
    try {
        name = await resolveStudentNameForMarks(pool, input.studentId);
    }
    catch (err) {
        logAdminMarksStageFailure("student lookup", err);
        throw err;
    }
    if (name == null) {
        console.error("[admin-marks] student lookup: no student name found for marks insert", { studentId: input.studentId.trim() });
        throw new Error("Student not found for marks insert.");
    }
    let course;
    try {
        course = await resolveCourseTitleAndUnits(pool, input.courseCode);
    }
    catch (err) {
        logAdminMarksStageFailure("course lookup", err);
        throw err;
    }
    if (course == null) {
        console.error("[admin-marks] course lookup: no portal_courses row for marks insert", { courseCode: input.courseCode.trim() });
        throw new Error("Course not found in portal_courses for marks insert.");
    }
    try {
        await pool.query(`INSERT INTO marks (
       name, id, regis, code, grade, grade2, course_title, units,
       days, time_from, time_to, instructor, term, year, language, indie_study
     ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, '', '00:00:00', '00:00:00', '', ?, ?, 'English', '')`, [
            name,
            input.studentId.trim(),
            input.courseCode.trim(),
            input.grade.trim(),
            grade2,
            course.title,
            course.units,
            input.legacyTerm.trim(),
            input.year,
        ]);
    }
    catch (err) {
        logAdminMarksStageFailure("marks insert", err);
        throw err;
    }
}
//# sourceMappingURL=adminMarksRepository.js.map