import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type CourseFeedbackDbRow = {
  id: number;
  student_external_id: string;
  course_code: string;
  term: string;
  year: number;
  q1_rating: number;
  q2_rating: number;
  q3_rating: number;
  q4_rating: number;
  q5_rating: number;
  overall_rating: number;
  comment: string | null;
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
};

/** Minimal row for academics “feedback submitted” map. */
export type CourseFeedbackSubmittedKeyRow = Pick<
  CourseFeedbackDbRow,
  "course_code" | "term" | "year" | "submitted_at"
>;

function mapFullRow(r: RowDataPacket): CourseFeedbackDbRow {
  const row = r as Record<string, unknown>;
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
    comment:
      row.comment == null ? null : String(row.comment).trim() || null,
    submitted_at:
      row.submitted_at instanceof Date
        ? row.submitted_at
        : new Date(String(row.submitted_at)),
    created_at:
      row.created_at instanceof Date
        ? row.created_at
        : new Date(String(row.created_at)),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at
        : new Date(String(row.updated_at)),
  };
}

function mapKeyRow(r: RowDataPacket): CourseFeedbackSubmittedKeyRow {
  const row = r as Record<string, unknown>;
  return {
    course_code: String(row.course_code ?? "").trim(),
    term: String(row.term ?? "").trim(),
    year: Number(row.year),
    submitted_at:
      row.submitted_at instanceof Date
        ? row.submitted_at
        : new Date(String(row.submitted_at)),
  };
}

export type CreateCourseFeedbackInput = {
  studentExternalId: string;
  courseCode: string;
  term: string;
  year: number;
  q1Rating: number;
  q2Rating: number;
  q3Rating: number;
  q4Rating: number;
  q5Rating: number;
  overallRating: number;
  comment: string | null;
};

export async function createCourseFeedback(
  pool: Pool,
  input: CreateCourseFeedbackInput,
): Promise<number> {
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO course_feedback (
      student_external_id, course_code, term, year,
      q1_rating, q2_rating, q3_rating, q4_rating, q5_rating,
      overall_rating, comment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
  );
  return res.insertId;
}

export async function findCourseFeedbackByStudentCourseTerm(
  pool: Pool,
  args: {
    studentExternalId: string;
    courseCode: string;
    term: string;
    year: number;
  },
): Promise<CourseFeedbackDbRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, student_external_id, course_code, term, year,
            q1_rating, q2_rating, q3_rating, q4_rating, q5_rating,
            overall_rating, comment, submitted_at, created_at, updated_at
     FROM course_feedback
     WHERE student_external_id = ?
       AND course_code = ?
       AND term = ?
       AND year = ?
     LIMIT 1`,
    [
      args.studentExternalId.trim(),
      args.courseCode.trim(),
      args.term.trim(),
      args.year,
    ],
  );
  if (rows.length === 0) return null;
  return mapFullRow(rows[0]!);
}

/** For merging feedback flags into GET /academics. */
export async function listCourseFeedbackSubmittedKeysForStudent(
  pool: Pool,
  studentExternalId: string,
): Promise<CourseFeedbackSubmittedKeyRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT course_code, term, year, submitted_at
     FROM course_feedback
     WHERE student_external_id = ?
     ORDER BY year DESC, submitted_at DESC`,
    [studentExternalId.trim()],
  );
  return rows.map(mapKeyRow);
}
