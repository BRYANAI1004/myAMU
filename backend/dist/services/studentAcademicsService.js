import { DEMO_STUDENT_ID } from "../config/constants.js";
import { pool } from "../lib/db.js";
import { listMarksForStudent, } from "../repositories/studentAcademicsRepository.js";
function formatMysqlTime(v) {
    if (v == null)
        return null;
    if (v instanceof Date) {
        const s = v.toISOString().slice(11, 19);
        return s.length > 0 ? s : null;
    }
    const s = String(v).trim();
    return s.length > 0 ? s : null;
}
function nullableStr(s) {
    return s.length > 0 ? s : null;
}
function numericGradeFromDb(v) {
    if (v == null)
        return null;
    const s = String(v).trim();
    if (s === "")
        return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function transcriptGrade(grade) {
    return grade.length > 0 ? grade : null;
}
function termsMatch(a, b) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}
function buildPayload(studentId, rows) {
    if (rows.length === 0) {
        return {
            studentId,
            studentName: studentId,
            currentTerm: null,
            currentSchedule: [],
            transcript: [],
            enrollmentHistory: [],
        };
    }
    const nameFromMarks = rows[0].name.trim();
    const studentName = nameFromMarks.length > 0 ? nameFromMarks : studentId;
    const latest = rows[0];
    const currentTerm = {
        term: latest.term,
        year: latest.year,
    };
    const currentSchedule = rows
        .filter((r) => r.year === latest.year && termsMatch(r.term, latest.term))
        .map((r) => ({
        courseCode: r.code,
        courseTitle: r.course_title,
        days: r.days,
        timeFrom: formatMysqlTime(r.time_from),
        timeTo: formatMysqlTime(r.time_to),
        instructor: nullableStr(r.instructor),
        term: r.term,
        year: r.year,
    }));
    const transcript = rows.map((r) => ({
        courseCode: r.code,
        courseTitle: r.course_title,
        term: r.term,
        year: r.year,
        grade: transcriptGrade(r.grade),
        numericGrade: numericGradeFromDb(r.grade2),
    }));
    const enrollmentHistory = rows.map((r) => ({
        courseCode: r.code,
        courseTitle: r.course_title,
        term: r.term,
        year: r.year,
    }));
    return {
        studentId,
        studentName,
        currentTerm,
        currentSchedule,
        transcript,
        enrollmentHistory,
    };
}
export async function getStudentAcademicsPayload(studentId) {
    const trimmed = studentId.trim();
    if (trimmed === "") {
        return {
            studentId: "",
            studentName: "",
            currentTerm: null,
            currentSchedule: [],
            transcript: [],
            enrollmentHistory: [],
        };
    }
    if (trimmed === DEMO_STUDENT_ID) {
        return {
            studentId: trimmed,
            studentName: trimmed,
            currentTerm: null,
            currentSchedule: [],
            transcript: [],
            enrollmentHistory: [],
        };
    }
    const rows = await listMarksForStudent(pool, trimmed);
    return buildPayload(trimmed, rows);
}
//# sourceMappingURL=studentAcademicsService.js.map