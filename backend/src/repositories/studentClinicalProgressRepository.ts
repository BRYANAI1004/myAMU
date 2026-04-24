/**
 * Clinical progress rows for student/admin clinical progress tabs.
 * Source of truth is `clinical_assignments`; exam history merges requests + legacy signals.
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

type ClinicalExamRequestRow = {
  examCode: string;
  examName: string;
  status: string;
  term: string | null;
  year: number | null;
  createdAt: Date | string | null;
};

function lower(v: unknown): string {
  return str(v).toLowerCase();
}

function formatTermYear(termRaw: unknown, yearRaw: unknown): {
  term: string | null;
  year: number | null;
} {
  const term = str(termRaw);
  const year = optionalYearNum(yearRaw);
  return { term: term === "" ? null : term, year };
}

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

function buildClinicalExamHistory(
  marksRows: MarksExamRow[],
  examRequests: ClinicalExamRequestRow[],
  legacyExamSignals: Map<string, string>,
): StudentClinicalExamHistoryItem[] {
  const requestByExamCode = new Map<string, ClinicalExamRequestRow[]>();
  for (const row of examRequests) {
    const code = row.examCode.trim().toUpperCase();
    if (code === "") continue;
    const list = requestByExamCode.get(code) ?? [];
    list.push(row);
    requestByExamCode.set(code, list);
  }
  for (const [, rows] of requestByExamCode) {
    rows.sort((a, b) => {
      const at = a.createdAt == null ? 0 : new Date(a.createdAt).getTime();
      const bt = b.createdAt == null ? 0 : new Date(b.createdAt).getTime();
      return bt - at;
    });
  }

  const marks = buildClinicalExamHistoryFromMarks(marksRows);
  return CLINICAL_EXAMS.map(({ code: examCode, name: defaultExamName }) => {
    const normalized = examCode.trim().toUpperCase();
    const req = requestByExamCode.get(normalized)?.[0];
    if (req) {
      const requestStatus = lower(req.status);
      return {
        code: examCode,
        examName: req.examName.trim() || defaultExamName,
        status: "Pending Grade",
        grade: requestStatus === "cancelled" ? "Cancelled" : "Requested",
        term: req.term,
        year: req.year,
      };
    }

    const legacySignal = lower(legacyExamSignals.get(normalized));
    if (legacySignal === "requested" || legacySignal === "cancelled") {
      return {
        code: examCode,
        examName: defaultExamName,
        status: "Pending Grade",
        grade: legacySignal === "cancelled" ? "Cancelled" : "Requested",
        term: null,
        year: null,
      };
    }

    const fromMarks = marks.find((m) => m.code.trim().toUpperCase() === normalized);
    if (fromMarks) return fromMarks;
    return {
      code: examCode,
      examName: defaultExamName,
      status: "Not Taken",
      grade: null,
      term: null,
      year: null,
    };
  });
}

/**
 * Clinical progress for student/admin tabs using `clinical_assignments` as the primary source.
 */
export async function loadStudentClinicalProgressFromClinic(
  pool: Pool,
  studentRouteParam: string,
): Promise<{
  completedCount: number;
  totalHours: number;
  records: StudentClinicalProgressRecord[];
  exams: StudentClinicalExamHistoryItem[];
}> {
  const requested = studentRouteParam.trim();
  const [studentRows] = await pool.query<RowDataPacket[]>(
    `SELECT TRIM(id) AS student_id,
            seqNum AS student_seq_num,
            exam,
            level1exam,
            level2exam,
            level3exam,
            level1practice
       FROM students
      WHERE TRIM(id) = TRIM(?)
         OR CAST(seqNum AS CHAR) = TRIM(?)
      ORDER BY CASE WHEN TRIM(id) = TRIM(?) THEN 0 ELSE 1 END
      LIMIT 1`,
    [requested, requested, requested],
  );
  const student = (studentRows[0] ?? null) as Record<string, unknown> | null;
  if (student == null) {
    return { completedCount: 0, totalHours: 0, records: [], exams: [] };
  }

  const resolvedStudentId = str(student.student_id);
  const resolvedSeqNum = Number(student.student_seq_num);

  const [assignmentRowsResult, enrollmentCountResult, examRequestRowsResult, marksRowsResult] =
    await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT ca.id,
                ca.session_name,
                ca.session_date,
                ca.term,
                ca.year,
                ca.status,
                ca.timetable_id,
                ca.created_at,
                CASE
                  WHEN ca.session_date = '1900-01-01' THEN NULL
                  WHEN ca.timetable_id IS NULL THEN NULL
                  WHEN ct.time_from IS NULL OR ct.time_to IS NULL THEN NULL
                  ELSE GREATEST(
                    0,
                    TIMESTAMPDIFF(MINUTE, ct.time_from, ct.time_to) / 60
                  )
                END AS derived_hours
           FROM clinical_assignments ca
           LEFT JOIN clinic_timetable ct
             ON ca.timetable_id = ct.seqNum
          WHERE TRIM(ca.student_id) = TRIM(?)
            AND LOWER(TRIM(COALESCE(ca.status, ''))) NOT IN ('dropped', 'cancelled')
          ORDER BY ca.session_date DESC, ca.created_at DESC`,
        [resolvedStudentId],
      ),
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS enrollment_count
           FROM clinical_enrollments
          WHERE TRIM(student_id) = TRIM(?)`,
        [resolvedStudentId],
      ),
      pool.query<RowDataPacket[]>(
        `SELECT exam_code,
                exam_name,
                status,
                term,
                year,
                created_at
           FROM clinical_exam_requests
          WHERE TRIM(student_id) = TRIM(?)
          ORDER BY created_at DESC`,
        [resolvedStudentId],
      ),
      pool.query<RowDataPacket[]>(
        `SELECT TRIM(code) AS code,
                grade,
                TRIM(term) AS term,
                \`year\`
           FROM marks
          WHERE TRIM(id) = TRIM(?)
            AND UPPER(TRIM(code)) LIKE 'CL%'
          ORDER BY ${MARKS_ORDER_BY_NEWEST}`,
        [resolvedStudentId],
      ),
    ]);

  const assignmentRows = assignmentRowsResult[0] as RowDataPacket[];
  const records: StudentClinicalProgressRecord[] = assignmentRows.map((r) => {
    const row = r as Record<string, unknown>;
    const termYear = formatTermYear(row.term, row.year);
    return {
      code: String(Number(row.id)),
      courseTitle: str(row.session_name),
      term: termYear.term ?? "",
      year: termYear.year ?? 0,
      grade: str(row.status),
      hours: numHours(row.derived_hours),
    };
  });

  const marksExamRows: MarksExamRow[] = (marksRowsResult[0] as RowDataPacket[]).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      code: str(row.code),
      grade: str(row.grade),
      term: str(row.term),
      year: optionalYearNum(row.year),
    };
  });

  const examRequestRows: ClinicalExamRequestRow[] = (
    examRequestRowsResult[0] as RowDataPacket[]
  ).map((r) => {
    const row = r as Record<string, unknown>;
    const termYear = formatTermYear(row.term, row.year);
    return {
      examCode: str(row.exam_code),
      examName: str(row.exam_name),
      status: str(row.status),
      term: termYear.term,
      year: termYear.year,
      createdAt: (row.created_at ?? null) as Date | string | null,
    };
  });

  const legacyExamSignals = new Map<string, string>();
  const legacySignalRows: Array<{ examCode: string; value: unknown }> = [
    { examCode: "CL100", value: student.exam },
    { examCode: "CL110", value: student.level1practice },
    { examCode: "CL120", value: student.level1exam },
    { examCode: "CL200", value: student.level2exam },
    { examCode: "CL300", value: student.level3exam },
  ];
  for (const row of legacySignalRows) {
    const value = str(row.value);
    if (value !== "") legacyExamSignals.set(row.examCode, value);
  }

  const exams = buildClinicalExamHistory(
    marksExamRows,
    examRequestRows,
    legacyExamSignals,
  );

  const completedCount = records.filter((r) => {
    const s = lower(r.grade);
    return s === "completed" || s === "done";
  }).length;
  const totalHoursRaw = records.reduce((sum, row) => sum + numHours(row.hours), 0);
  const totalHours =
    totalHoursRaw > 0 ? totalHoursRaw : records.length > 0 ? records.length : 0;

  const enrollmentCount = Number(
    ((enrollmentCountResult[0] as RowDataPacket[])[0] as Record<string, unknown> | undefined)
      ?.enrollment_count ?? 0,
  );
  console.debug("[clinical-progress] resolved source", {
    requestedParam: requested,
    resolvedStudentsSeqNum: Number.isFinite(resolvedSeqNum) ? resolvedSeqNum : null,
    resolvedStudentsId: resolvedStudentId,
    assignmentCount: records.length,
    enrollmentCount: Number.isFinite(enrollmentCount)
      ? Math.trunc(enrollmentCount)
      : 0,
    examRequestCount: examRequestRows.length,
  });

  return {
    completedCount,
    totalHours,
    records,
    exams,
  };
}
