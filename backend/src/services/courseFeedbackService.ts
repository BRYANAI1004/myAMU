import { DEMO_STUDENT_ID } from "../config/constants.js";
import { pool } from "../lib/db.js";
import {
  createCourseFeedback,
  findCourseFeedbackByStudentCourseTerm,
  type CourseFeedbackDbRow,
} from "../repositories/courseFeedbackRepository.js";

export type CourseFeedbackApiRecord = {
  id: number;
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
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

function toIso(d: Date): string {
  return d.toISOString();
}

function rowToApi(r: CourseFeedbackDbRow): CourseFeedbackApiRecord {
  return {
    id: r.id,
    studentExternalId: r.student_external_id,
    courseCode: r.course_code,
    term: r.term,
    year: r.year,
    q1Rating: r.q1_rating,
    q2Rating: r.q2_rating,
    q3Rating: r.q3_rating,
    q4Rating: r.q4_rating,
    q5Rating: r.q5_rating,
    overallRating: r.overall_rating,
    comment: r.comment,
    submittedAt: toIso(r.submitted_at),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function isRating1to5(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}

export type SubmitCourseFeedbackBody = {
  term: string;
  year: number;
  courseCode: string;
  q1Rating: number;
  q2Rating: number;
  q3Rating: number;
  q4Rating: number;
  q5Rating: number;
  overallRating: number;
  comment: string | null;
};

export function parseSubmitCourseFeedbackBody(
  body: unknown,
): SubmitCourseFeedbackBody | null {
  if (body == null || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const term = typeof o.term === "string" ? o.term.trim() : "";
  const courseCode =
    typeof o.courseCode === "string" ? o.courseCode.trim() : "";
  const yearRaw = o.year;
  const year = typeof yearRaw === "number" ? yearRaw : Number(yearRaw);
  if (!term || !courseCode || !Number.isFinite(year) || Math.floor(year) !== year) {
    return null;
  }
  const q1 = o.q1Rating ?? o.q1_rating;
  const q2 = o.q2Rating ?? o.q2_rating;
  const q3 = o.q3Rating ?? o.q3_rating;
  const q4 = o.q4Rating ?? o.q4_rating;
  const q5 = o.q5Rating ?? o.q5_rating;
  const overall = o.overallRating ?? o.overall_rating;
  if (
    !isRating1to5(q1) ||
    !isRating1to5(q2) ||
    !isRating1to5(q3) ||
    !isRating1to5(q4) ||
    !isRating1to5(q5) ||
    !isRating1to5(overall)
  ) {
    return null;
  }
  let comment: string | null = null;
  if (o.comment != null) {
    const c =
      typeof o.comment === "string"
        ? o.comment.trim()
        : String(o.comment).trim();
    comment = c.length > 0 ? c : null;
  }
  return {
    term,
    year,
    courseCode,
    q1Rating: q1,
    q2Rating: q2,
    q3Rating: q3,
    q4Rating: q4,
    q5Rating: q5,
    overallRating: overall,
    comment,
  };
}

export type SubmitCourseFeedbackResult =
  | { ok: true }
  | { ok: false; status: 400 | 409; message: string };

export async function submitCourseFeedback(
  studentExternalId: string,
  body: SubmitCourseFeedbackBody,
): Promise<SubmitCourseFeedbackResult> {
  const sid = studentExternalId.trim();
  if (sid === "" || sid === DEMO_STUDENT_ID) {
    return {
      ok: false,
      status: 400,
      message: "Invalid or unsupported student id.",
    };
  }

  const existing = await findCourseFeedbackByStudentCourseTerm(pool, {
    studentExternalId: sid,
    courseCode: body.courseCode,
    term: body.term,
    year: body.year,
  });
  if (existing != null) {
    return {
      ok: false,
      status: 409,
      message: "Feedback has already been submitted for this course and term.",
    };
  }

  try {
    await createCourseFeedback(pool, {
      studentExternalId: sid,
      courseCode: body.courseCode,
      term: body.term,
      year: body.year,
      q1Rating: body.q1Rating,
      q2Rating: body.q2Rating,
      q3Rating: body.q3Rating,
      q4Rating: body.q4Rating,
      q5Rating: body.q5Rating,
      overallRating: body.overallRating,
      comment: body.comment,
    });
    return { ok: true };
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "ER_DUP_ENTRY") {
      return {
        ok: false,
        status: 409,
        message: "Feedback has already been submitted for this course and term.",
      };
    }
    throw e;
  }
}

export async function getCourseFeedbackForQuery(
  studentExternalId: string,
  query: { term: string; year: number; courseCode: string },
): Promise<CourseFeedbackApiRecord | null> {
  const sid = studentExternalId.trim();
  if (sid === "" || sid === DEMO_STUDENT_ID) return null;
  const row = await findCourseFeedbackByStudentCourseTerm(pool, {
    studentExternalId: sid,
    courseCode: query.courseCode.trim(),
    term: query.term.trim(),
    year: query.year,
  });
  return row == null ? null : rowToApi(row);
}
