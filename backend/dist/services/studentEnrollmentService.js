import { getAcademicTermById } from "../repositories/academicTermRepository.js";
import { enrollStudentInSections, } from "../repositories/studentEnrollmentRepository.js";
import { InvalidAcademicTermError } from "./courseSectionService.js";
/**
 * Registers sections under the academic term’s `term_name` and `year`. Those values are the same
 * quarter key used by `portal_enrollments` and by finance (`getAccountingQuartersPayload` /
 * `getAccountingLedgerPayload` portal fallback), so a completed registration appears on the ledger
 * for that term without hardcoded quarter data.
 */
export async function enrollStudentForAcademicTerm(studentId, academicTermId, sections) {
    const row = await getAcademicTermById(academicTermId.trim());
    if (!row)
        throw new InvalidAcademicTermError();
    return enrollStudentInSections(studentId, row.term_name, row.year, sections);
}
//# sourceMappingURL=studentEnrollmentService.js.map