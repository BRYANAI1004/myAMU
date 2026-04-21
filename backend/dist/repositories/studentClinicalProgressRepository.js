/**
 * Student-facing clinical completion rows from legacy `clinic` only (grade P, raw hours),
 * plus fixed clinical exam history from the same `clinic` table.
 */
import { CLINICAL_EXAMS } from "../constants/clinicalExams.js";
function str(v) {
    if (v == null)
        return "";
    return String(v).trim();
}
function numHours(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function numYear(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function codeStartsWithExamCode(codeRaw, examCode) {
    const c = codeRaw.trim().toUpperCase();
    const p = examCode.trim().toUpperCase();
    return c.startsWith(p);
}
function gradeIsPresent(gradeRaw) {
    return str(gradeRaw) !== "";
}
/**
 * Fixed list of five clinical exams, merged with `clinic` rows (code prefix match, same student).
 * Status: any matching row with non-empty grade → Completed; else any row → Pending Grade; else Not Taken.
 */
function buildClinicalExamHistory(examRows) {
    return CLINICAL_EXAMS.map(({ code: examCode, name: examName }) => {
        const matches = examRows.filter((r) => codeStartsWithExamCode(r.code, examCode));
        if (matches.length === 0) {
            return {
                code: examCode,
                examName,
                status: "Not Taken",
                grade: null,
                term: null,
                year: null,
            };
        }
        const sorted = [...matches].sort((a, b) => {
            if (b.year !== a.year)
                return b.year - a.year;
            return str(b.term).localeCompare(str(a.term));
        });
        const graded = sorted.find((r) => gradeIsPresent(r.grade));
        if (graded) {
            return {
                code: examCode,
                examName,
                status: "Completed",
                grade: str(graded.grade),
                term: str(graded.term) || null,
                year: Number.isFinite(graded.year) ? graded.year : null,
            };
        }
        const latest = sorted[0];
        return {
            code: examCode,
            examName,
            status: "Pending Grade",
            grade: null,
            term: str(latest.term) || null,
            year: Number.isFinite(latest.year) ? latest.year : null,
        };
    });
}
/**
 * Lists passed clinical rows and a summary from `clinic` (source of truth for this endpoint).
 */
export async function loadStudentClinicalProgressFromClinic(pool, studentId) {
    const sid = studentId.trim();
    const baseWhere = `TRIM(id) = TRIM(?)
     AND UPPER(TRIM(grade)) = 'P'`;
    const [detailRows] = await pool.query(`SELECT code,
            course_title,
            term,
            year,
            grade,
            hours
     FROM clinic
     WHERE ${baseWhere}
     ORDER BY \`year\`, term`, [sid]);
    const [sumRows] = await pool.query(`SELECT COUNT(*) AS completedCount,
            COALESCE(SUM(hours), 0) AS totalHours
     FROM clinic
     WHERE ${baseWhere}`, [sid]);
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
    const examLikeConditions = CLINICAL_EXAMS.map(() => `UPPER(TRIM(code)) LIKE CONCAT(?, '%')`).join("\n         OR ");
    const [examDetailRows] = await pool.query(`SELECT code, grade, term, \`year\`
     FROM clinic
     WHERE TRIM(id) = TRIM(?)
       AND (${examLikeConditions})
     ORDER BY \`year\` DESC, term DESC`, [sid, ...CLINICAL_EXAMS.map((e) => e.code.toUpperCase())]);
    const examRows = examDetailRows.map((r) => {
        const row = r;
        return {
            code: str(row.code),
            grade: str(row.grade),
            term: str(row.term),
            year: numYear(row.year),
        };
    });
    const exams = buildClinicalExamHistory(examRows);
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