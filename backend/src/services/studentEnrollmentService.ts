import { getAcademicTermById } from "../repositories/academicTermRepository.js";
import {
  enrollStudentInSections,
  type EnrollSectionInput,
} from "../repositories/studentEnrollmentRepository.js";
import { InvalidAcademicTermError } from "./courseSectionService.js";

export type { EnrollSectionInput };

export async function enrollStudentForAcademicTerm(
  studentId: string,
  academicTermId: string,
  sections: EnrollSectionInput[],
): Promise<
  { ok: true; insertedCount: number } | { ok: false; error: string }
> {
  const row = await getAcademicTermById(academicTermId.trim());
  if (!row) throw new InvalidAcademicTermError();
  return enrollStudentInSections(studentId, row.term_name, row.year, sections);
}
