import { DEMO_STUDENT_ID } from "../config/constants.js";
import { pool } from "../lib/db.js";
import {
  listCourseFeedbackSubmittedKeysForStudent,
  type CourseFeedbackSubmittedKeyRow,
} from "../repositories/courseFeedbackRepository.js";

/** Map key aligned with `enrichEnrollmentWithFeedback` in studentAcademicsService. */
export function courseFeedbackLookupKey(
  courseCode: string,
  term: string,
  year: number,
): string {
  return `${courseCode.trim()}\t${term.trim().toLowerCase()}\t${year}`;
}

export function feedbackSubmittedAtMapFromDbRows(
  rows: CourseFeedbackSubmittedKeyRow[],
): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    const k = courseFeedbackLookupKey(r.course_code, r.term, r.year);
    const iso =
      r.submitted_at instanceof Date
        ? r.submitted_at.toISOString()
        : new Date(r.submitted_at).toISOString();
    if (!m.has(k)) m.set(k, iso);
  }
  return m;
}

/** For merging into GET /academics `enrollmentHistory` (combined registration + attempts; skips DB for demo / empty id). */
export async function getFeedbackSubmittedAtMapForStudent(
  studentId: string,
): Promise<Map<string, string>> {
  const sid = studentId.trim();
  if (sid === "" || sid === DEMO_STUDENT_ID) return new Map();
  const rows = await listCourseFeedbackSubmittedKeysForStudent(pool, sid);
  return feedbackSubmittedAtMapFromDbRows(rows);
}
