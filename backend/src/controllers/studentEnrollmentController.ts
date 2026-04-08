import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { removeAdminPortalEnrollment } from "../services/adminEnrollmentService.js";
import { getAcademicTermById } from "../repositories/academicTermRepository.js";
import { listStudentEnrolledSectionRows } from "../repositories/studentEnrollmentRepository.js";
import { InvalidAcademicTermError } from "../services/courseSectionService.js";
import {
  enrollStudentForAcademicTerm,
  RegistrationLockedOverdueBalanceError,
  type EnrollSectionInput,
} from "../services/studentEnrollmentService.js";

function devMessage(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
}

function parseEnrollBody(
  body: unknown,
): {
  studentId: string;
  academic_term_id: string;
  sections: EnrollSectionInput[];
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const studentId = typeof o.studentId === "string" ? o.studentId.trim() : "";
  const academic_term_id =
    typeof o.academic_term_id === "string" ? o.academic_term_id.trim() : "";
  const sectionsRaw = o.sections;
  if (!studentId || !academic_term_id || !Array.isArray(sectionsRaw)) {
    return null;
  }
  const sections: EnrollSectionInput[] = [];
  for (const el of sectionsRaw) {
    if (el == null || typeof el !== "object") return null;
    const s = el as Record<string, unknown>;
    const course_code =
      typeof s.course_code === "string" ? s.course_code.trim() : "";
    const section_code =
      typeof s.section_code === "string" ? s.section_code.trim() : "";
    if (!course_code || !section_code) return null;
    let schedule_track: "EN" | "CN" | undefined;
    if (Object.prototype.hasOwnProperty.call(s, "schedule_track")) {
      const raw = s.schedule_track;
      if (raw !== null && typeof raw !== "string") return null;
      if (typeof raw === "string") {
        const t = raw.trim().toUpperCase();
        if (t === "") schedule_track = undefined;
        else if (t === "EN" || t === "CN") schedule_track = t;
        else return null;
      }
    }
    sections.push({
      course_code,
      section_code,
      ...(schedule_track !== undefined ? { schedule_track } : {}),
    });
  }
  return { studentId, academic_term_id, sections };
}

function parseQueryString(req: Request, key: string): string | null {
  const raw = req.query[key];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function parseStudentWithdrawBody(
  body: unknown,
): { studentId: string; academic_term_id: string; course_code: string } | null {
  if (body == null || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const studentId = typeof o.studentId === "string" ? o.studentId.trim() : "";
  const academic_term_id =
    typeof o.academic_term_id === "string" ? o.academic_term_id.trim() : "";
  const course_code =
    typeof o.course_code === "string" ? o.course_code.trim() : "";
  if (studentId === "" || academic_term_id === "" || course_code === "") {
    return null;
  }
  return { studentId, academic_term_id, course_code };
}

export async function postStudentEnroll(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = parseEnrollBody(req.body);
    if (!parsed) {
      res.status(400).json({
        error:
          "Invalid body: require studentId, academic_term_id, and sections[{ course_code, section_code, schedule_track? }]. schedule_track must be EN or CN when provided.",
      });
      return;
    }
    const result = await enrollStudentForAcademicTerm(
      parsed.studentId,
      parsed.academic_term_id,
      parsed.sections,
    );
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true, insertedCount: result.insertedCount });
  } catch (e) {
    if (e instanceof RegistrationLockedOverdueBalanceError) {
      res.status(400).json({ error: e.message });
      return;
    }
    if (e instanceof InvalidAcademicTermError) {
      res.status(400).json({
        error:
          "The selected academic term is not valid or no longer exists. Choose another term.",
      });
      return;
    }
    console.error("[student/enroll] failed:", e);
    const body: { error: string; message?: string } = {
      error: "Enrollment could not be completed. Please try again.",
    };
    if (env.nodeEnv === "development") body.message = devMessage(e);
    res.status(500).json(body);
  }
}

/**
 * GET /api/student/enrolled-sections?studentId=&academic_term_id=
 * Section rows for the student's portal enrollments in that term (one section per course when several exist).
 */
export async function getStudentEnrolledSections(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = parseQueryString(req, "studentId");
    const academicTermId = parseQueryString(req, "academic_term_id");
    if (!studentId || !academicTermId) {
      res.status(400).json({
        error: "Query parameters studentId and academic_term_id are required.",
      });
      return;
    }
    const row = await getAcademicTermById(academicTermId);
    if (!row) {
      res.status(400).json({
        error:
          "The selected academic term is not valid or no longer exists. Choose another term.",
      });
      return;
    }
    const sections = await listStudentEnrolledSectionRows(
      studentId,
      row.term_name,
      row.year,
    );
    res.json(sections);
  } catch (e) {
    console.error("[student/enrolled-sections] failed:", e);
    const body: { error: string; message?: string } = {
      error: "Failed to load enrolled sections.",
    };
    if (env.nodeEnv === "development") body.message = devMessage(e);
    res.status(500).json(body);
  }
}

/**
 * POST /api/student/withdraw
 * Body: { studentId, academic_term_id, course_code }
 * Soft-withdraws the portal enrollment (same contract as admin enrollment delete).
 */
export async function postStudentWithdraw(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = parseStudentWithdrawBody(req.body);
    if (parsed == null) {
      res.status(400).json({
        error:
          "Request body must include studentId, academic_term_id, and course_code.",
      });
      return;
    }
    const result = await removeAdminPortalEnrollment(parsed);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true, removedCount: result.removedCount });
  } catch (e) {
    console.error("[student/withdraw] failed:", e);
    const body: { error: string; message?: string } = {
      error: "Withdrawal could not be completed. Please try again.",
    };
    if (env.nodeEnv === "development") body.message = devMessage(e);
    res.status(500).json(body);
  }
}
