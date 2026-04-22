/**
 * Student-facing clinical completion rows from legacy `clinic` (non-empty grade + hours),
 * plus fixed clinical exam history from legacy `marks` (transcript source — not `clinic`).
 */

import type { Pool, RowDataPacket } from "mysql2/promise";

import { CLINICAL_EXAMS } from "../constants/clinicalExams.js";
import { MARKS_ORDER_BY_NEWEST } from "./studentAcademicsRepository.js";

export type StudentClinicalProgressRecord = {
  code: string;
  courseTitle: string;
  term: string;
  year: number;
  grade: string;
  hours: number;
};

export type StudentClinicalExamHistoryItem = {
  code: string;
  examName: string;
  status: "Not Taken" | "Pending Grade" | "Completed";
  grade: string | null;
  term: string | null;
  year: number | null;
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function numHours(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function optionalYearNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type MarksExamRow = {
  code: string;
  grade: string;
  term: string;
  year: number | null;
};

/**
 * Fixed list of five clinical exams merged with `marks` rows (code prefix match).
 * `marksRows` should be ordered newest-first so the first prefix match is the latest attempt.
 */
function buildClinicalExamHistoryFromMarks(
  marksRows: MarksExamRow[],
): StudentClinicalExamHistoryItem[] {
  return CLINICAL_EXAMS.map(({ code: examCode, name: examName }) => {
    const examPrefix = examCode.trim().toUpperCase();
    const record = marksRows.find((m) =>
      m.code.trim().toUpperCase().startsWith(examPrefix),
    );
    if (!record) {
      return {
        code: examCode,
        examName,
        status: "Not Taken" as const,
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
        status: "Pending Grade" as const,
        grade: null,
        term: str(record.term) || null,
        year: record.year,
      };
    }
    return {
      code: examCode,
      examName,
      status: "Completed" as const,
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
export async function loadStudentClinicalProgressFromClinic(
  pool: Pool,
  studentId: string,
): Promise<{
  completedCount: number;
  totalHours: number;
  records: StudentClinicalProgressRecord[];
  exams: StudentClinicalExamHistoryItem[];
}> {
  const sid = studentId.trim();
  const clinicCompletedWhere = `TRIM(id) = TRIM(?)
     AND TRIM(COALESCE(grade, '')) <> ''
     AND (
       UPPER(TRIM(code)) LIKE 'CL111%'
       OR UPPER(TRIM(code)) LIKE 'CL113%'
       OR UPPER(TRIM(code)) LIKE 'CL211%'
       OR UPPER(TRIM(code)) LIKE 'CL311%'
     )`;

  const [detailRows] = await pool.query<RowDataPacket[]>(
    `SELECT code,
            course_title,
            term,
            year,
            grade,
            hours
     FROM clinic
     WHERE ${clinicCompletedWhere}
     ORDER BY \`year\`, term, code`,
    [sid],
  );

  const [sumRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS completedCount,
            COALESCE(SUM(hours), 0) AS totalHours
     FROM clinic
     WHERE ${clinicCompletedWhere}`,
    [sid],
  );

  const sum = sumRows[0] as Record<string, unknown> | undefined;
  const completedCountRaw = Number(sum?.completedCount);
  const totalHoursRaw = Number(sum?.totalHours);

  const records: StudentClinicalProgressRecord[] = detailRows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      code: str(row.code),
      courseTitle: str(row.course_title),
      term: str(row.term),
      year: Number(row.year),
      grade: str(row.grade),
      hours: numHours(row.hours),
    };
  });

  const [marksExamRowsRaw] = await pool.query<RowDataPacket[]>(
    `SELECT TRIM(code) AS code,
            course_title,
            grade,
            TRIM(term) AS term,
            \`year\`
     FROM marks
     WHERE TRIM(id) = TRIM(?)
       AND UPPER(TRIM(code)) LIKE 'CL%'
     ORDER BY ${MARKS_ORDER_BY_NEWEST}`,
    [sid],
  );

  const marksExamRows: MarksExamRow[] = marksExamRowsRaw.map((r) => {
    const row = r as Record<string, unknown>;
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
