/**
 * Student-facing clinical completion rows from legacy `clinic` (non-empty grade + hours),
 * plus fixed clinical exam history from legacy `marks` (transcript source — not `clinic`).
 */
import { CLINICAL_EXAMS } from "../constants/clinicalExams.js";
import { MARKS_ORDER_BY_NEWEST } from "./studentAcademicsRepository.js";
function str(v) {
    if (v == null)
        return "";
    return String(v).trim();
}
function numHours(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function optionalYearNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
/**
 * Fixed list of five clinical exams merged with `marks` rows (code prefix match).
 * `marksRows` should be ordered newest-first so the first prefix match is the latest attempt.
 */
function buildClinicalExamHistoryFromMarks(marksRows) {
    return CLINICAL_EXAMS.map(({ code: examCode, name: examName }) => {
        const examPrefix = examCode.trim().toUpperCase();
        const record = marksRows.find((m) => m.code.trim().toUpperCase().startsWith(examPrefix));
        if (!record) {
            return {
                code: examCode,
                examName,
                status: "Not Taken",
                grade: null,
                term: null,
                year: null,
            };
        }
        const grade = str(record.grade);
        if (grade === "") {
            return {
                code: examCode,
                examName,
                status: "Pending Grade",
                grade: null,
                term: str(record.term) || null,
                year: record.year,
            };
        }
        return {
            code: examCode,
            examName,
            status: "Completed",
            grade,
            term: str(record.term) || null,
            year: record.year,
        };
    });
}
/**
 * Lists completed clinical rows (any non-empty grade) and hours from `clinic`;
 * exam history from `marks` only.
 */
export async function loadStudentClinicalProgressFromClinic(pool, studentId) {
    const sid = studentId.trim();
    const clinicCompletedWhere = `TRIM(id) = TRIM(?)
     AND TRIM(COALESCE(grade, '')) <> ''
     AND (
       UPPER(TRIM(code)) LIKE 'CL111%'
       OR UPPER(TRIM(code)) LIKE 'CL113%'
       OR UPPER(TRIM(code)) LIKE 'CL211%'
       OR UPPER(TRIM(code)) LIKE 'CL311%'
     )`;
    const [detailRows] = await pool.query(`SELECT code,
            course_title,
            term,
            year,
            grade,
            hours
     FROM clinic
     WHERE ${clinicCompletedWhere}
     ORDER BY \`year\`, term, code`, [sid]);
    const [sumRows] = await pool.query(`SELECT COUNT(*) AS completedCount,
            COALESCE(SUM(hours), 0) AS totalHours
     FROM clinic
     WHERE ${clinicCompletedWhere}`, [sid]);
    const sum = sumRows[0];
    const completedCountRaw = Number(sum?.completedCount);
    const totalHoursRaw = Number(sum?.totalHours);
    const records = detailRows.map((r) => {
        const row = r;
        return {
            code: str(row.code),
            courseTitle: str(row.course_title),
            term: str(row.term),
            year: Number(row.year),
            grade: str(row.grade),
            hours: numHours(row.hours),
        };
    });
    const [marksExamRowsRaw] = await pool.query(`SELECT TRIM(code) AS code,
            course_title,
            grade,
            TRIM(term) AS term,
            \`year\`
     FROM marks
     WHERE TRIM(id) = TRIM(?)
       AND UPPER(TRIM(code)) LIKE 'CL%'
     ORDER BY ${MARKS_ORDER_BY_NEWEST}`, [sid]);
    const marksExamRows = marksExamRowsRaw.map((r) => {
        const row = r;
        return {
            code: str(row.code),
            grade: str(row.grade),
            term: str(row.term),
            year: optionalYearNum(row.year),
        };
    });
    const exams = buildClinicalExamHistoryFromMarks(marksExamRows);
    return {
        completedCount: Number.isFinite(completedCountRaw)
            ? Math.trunc(completedCountRaw)
            : 0,
        totalHours: Number.isFinite(totalHoursRaw) ? totalHoursRaw : 0,
        records,
        exams,
    };
}
//# sourceMappingURL=studentClinicalProgressRepository.js.map