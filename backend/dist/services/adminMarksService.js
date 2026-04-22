import { pool } from "../lib/db.js";
import { getAcademicTermById } from "../repositories/academicTermRepository.js";
import { upsertMarkGrade } from "../repositories/adminMarksRepository.js";
/** Same letter → numeric mapping as admin roster UI; server is source of truth for `grade2`. */
const GRADE_TO_NUMERIC = {
    A: 4,
    "A-": 3.75,
    "B+": 3.5,
    B: 3,
    "B-": 2.75,
    "C+": 2.5,
    C: 2,
    "C-": 1.75,
    D: 1,
    F: 0,
    P: null,
    NP: null,
    INC: null,
};
function isClinicalAttemptCourseCode(code) {
    return /^(CL111|CL113|CL211|CL311)(-\d+)?$/i.test(code.trim());
}
async function assertEnrollmentAllowsMarkGrade(db, studentId, courseCode, legacyTerm, year) {
    const sid = studentId.trim();
    const code = courseCode.trim();
    const term = legacyTerm.trim();
    const [rows] = await db.query(`SELECT 1 AS ok
     FROM portal_enrollments e
     INNER JOIN portal_courses pc ON pc.course_id = e.course_id
     WHERE TRIM(e.student_external_id) = TRIM(?)
       AND TRIM(pc.course_code) = TRIM(?)
       AND TRIM(e.term) = TRIM(?)
       AND e.year = ?
       AND (e.status IS NULL OR LOWER(TRIM(e.status)) = 'active')
     LIMIT 1`, [sid, code, term, year]);
    if (rows.length === 0) {
        return {
            ok: false,
            error: "Student has no active portal enrollment in this course for this term.",
        };
    }
    return { ok: true };
}
async function resolveStudentNameForMarks(conn, studentId) {
    const sid = studentId.trim();
    const [legacyRows] = await conn.query(`SELECT TRIM(name) AS name
       FROM students
      WHERE TRIM(id) = TRIM(?)
      LIMIT 1`, [sid]);
    if (legacyRows.length > 0) {
        const n = String(legacyRows[0].name ?? "").trim();
        if (n !== "")
            return n;
    }
    const [portalRows] = await conn.query(`SELECT TRIM(full_name) AS name
       FROM portal_students
      WHERE TRIM(student_external_id) = TRIM(?)
      LIMIT 1`, [sid]);
    if (portalRows.length > 0) {
        const n = String(portalRows[0].name ?? "").trim();
        if (n !== "")
            return n;
    }
    return sid;
}
async function updateClinicAndUpsertMarksForClinicalAttempt(args) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const sid = args.studentId.trim();
        const code = args.courseCode.trim().toUpperCase();
        const term = args.term.trim();
        const year = Math.trunc(args.year);
        const grade = args.grade.trim();
        const grade2 = args.grade2Numeric != null && Number.isFinite(args.grade2Numeric)
            ? args.grade2Numeric
            : 0;
        const [clinicRows] = await conn.query(`SELECT course_title, units, days, time_from, time_to, instructor
         FROM clinic
        WHERE TRIM(id) = TRIM(?)
          AND UPPER(TRIM(code)) = UPPER(TRIM(?))
          AND LOWER(TRIM(term)) = LOWER(TRIM(?))
          AND year = ?
        ORDER BY year DESC
        LIMIT 1
        FOR UPDATE`, [sid, code, term, year]);
        if (clinicRows.length === 0) {
            await conn.rollback();
            return {
                ok: false,
                status: 404,
                error: "Clinical attempt row not found in clinic for this term.",
            };
        }
        const clinic = clinicRows[0];
        const courseTitle = String(clinic.course_title ?? "").trim();
        const unitsRaw = Number(clinic.units);
        const units = Number.isFinite(unitsRaw) ? unitsRaw : 2;
        const days = String(clinic.days ?? "").trim();
        const timeFrom = String(clinic.time_from ?? "00:00:00");
        const timeTo = String(clinic.time_to ?? "00:00:00");
        const instructor = String(clinic.instructor ?? "").trim();
        const [clinicUpdate] = await conn.query(`UPDATE clinic
          SET grade = ?, grade2 = ?
        WHERE TRIM(id) = TRIM(?)
          AND UPPER(TRIM(code)) = UPPER(TRIM(?))
          AND LOWER(TRIM(term)) = LOWER(TRIM(?))
          AND year = ?`, [grade, grade2, sid, code, term, year]);
        if (Number(clinicUpdate.affectedRows ?? 0) <= 0) {
            await conn.rollback();
            return {
                ok: false,
                status: 404,
                error: "Clinical attempt row could not be updated.",
            };
        }
        const [marksSeqRows] = await conn.query(`SELECT seqNumber AS seq
         FROM marks
        WHERE TRIM(id) = TRIM(?)
          AND UPPER(TRIM(code)) = UPPER(TRIM(?))
          AND LOWER(TRIM(term)) = LOWER(TRIM(?))
          AND year = ?
        ORDER BY seqNumber DESC
        LIMIT 1
        FOR UPDATE`, [sid, code, term, year]);
        if (marksSeqRows.length > 0) {
            const seq = Number(marksSeqRows[0].seq);
            if (Number.isFinite(seq)) {
                await conn.query(`UPDATE marks
              SET course_title = ?,
                  grade = ?,
                  grade2 = ?
            WHERE seqNumber = ?`, [courseTitle, grade, grade2, Math.trunc(seq)]);
            }
        }
        else {
            const studentName = await resolveStudentNameForMarks(conn, sid);
            await conn.query(`INSERT INTO marks (
          name, id, regis, code, grade, grade2, course_title, units,
          days, time_from, time_to, instructor, term, year, language, indie_study
        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'English', '')`, [
                studentName,
                sid,
                code,
                grade,
                grade2,
                courseTitle,
                units,
                days,
                timeFrom,
                timeTo,
                instructor,
                term,
                year,
            ]);
        }
        await conn.commit();
        return { ok: true };
    }
    catch (e) {
        await conn.rollback();
        const o = e;
        const dbOrMsg = o?.sqlMessage ?? (e instanceof Error ? e.message : String(e));
        console.error("[admin-marks] clinical attempt grade update failed:", dbOrMsg);
        return {
            ok: false,
            status: 500,
            error: "Failed to save clinical attempt grade.",
        };
    }
    finally {
        conn.release();
    }
}
export async function setAdminStudentMarkGrade(input) {
    const studentId = input.studentId.trim();
    const courseCode = input.courseCode.trim();
    const academicTermId = input.academicTermId.trim();
    const grade = input.grade.trim();
    if (studentId === "" || courseCode === "" || academicTermId === "") {
        return { ok: false, status: 400, error: "Missing studentId, courseCode, or term." };
    }
    if (grade === "") {
        return { ok: false, status: 400, error: "Grade is required." };
    }
    if (!(grade in GRADE_TO_NUMERIC)) {
        return { ok: false, status: 400, error: "Invalid grade." };
    }
    const termRow = await getAcademicTermById(academicTermId);
    if (!termRow) {
        return {
            ok: false,
            status: 400,
            error: "The selected academic term is not valid or no longer exists.",
        };
    }
    const grade2Numeric = GRADE_TO_NUMERIC[grade] ?? null;
    if (isClinicalAttemptCourseCode(courseCode)) {
        return updateClinicAndUpsertMarksForClinicalAttempt({
            studentId,
            courseCode,
            term: termRow.term_name,
            year: termRow.year,
            grade,
            grade2Numeric,
        });
    }
    const gate = await assertEnrollmentAllowsMarkGrade(pool, studentId, courseCode, termRow.term_name, termRow.year);
    if (!gate.ok) {
        return { ok: false, status: 400, error: gate.error };
    }
    try {
        await upsertMarkGrade(pool, {
            studentId,
            courseCode,
            legacyTerm: termRow.term_name,
            year: termRow.year,
            grade,
            grade2Numeric,
        });
    }
    catch (e) {
        const o = e;
        const dbOrMsg = o?.sqlMessage ?? (e instanceof Error ? e.message : String(e));
        console.error("[admin-marks] upsertMarkGrade failed (see staged logs above if DB):", dbOrMsg);
        return {
            ok: false,
            status: 500,
            error: "Failed to save grade.",
        };
    }
    return { ok: true };
}
//# sourceMappingURL=adminMarksService.js.map