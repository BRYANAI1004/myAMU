import { getAcademicTermById } from "../repositories/academicTermRepository.js";
import { deletePortalEnrollmentByStudentCourseTermYear } from "../repositories/studentEnrollmentRepository.js";

export async function removeAdminPortalEnrollment(params: {
  studentId: string;
  academic_term_id: string;
  course_code: string;
}): Promise<
  { ok: true; removedCount: number } | { ok: false; error: string }
> {
  const tid = params.academic_term_id.trim();
  const sid = params.studentId.trim();
  const code = params.course_code.trim();
  if (tid === "" || sid === "" || code === "") {
    return { ok: false, error: "studentId, academic_term_id, and course_code are required." };
  }

  const term = await getAcademicTermById(tid);
  if (term == null) {
    return { ok: false, error: "Invalid or unknown academic_term_id." };
  }

  const removedCount = await deletePortalEnrollmentByStudentCourseTermYear(
    sid,
    code,
    term.term_name,
    term.year,
  );
  return { ok: true, removedCount };
}
