import {
  selectCourseNamesByCode,
  selectDistinctMarksInstructorsForCourse,
  selectDistinctTimetableInstructorIdsForCourse,
  selectInstructorNamesByInstructorId,
} from "../repositories/adminCourseMetaRepository.js";

export type InstructorSuggestion = {
  source: "timetable" | "marks";
  instructorId: string | null;
  nameEng: string | null;
  nameChi: string | null;
  rawText: string | null;
};

export type ResolvedCourseMeta = {
  title: string;
  /** @deprecated Prefer `instructorSuggestion` + track-aware display; kept Chinese-first for compatibility. */
  suggestedInstructor: string | null;
  instructorSuggestion: InstructorSuggestion | null;
};

function titleFromCourseRow(
  row: { chi_name: string; eng_name: string } | null,
  courseCode: string,
): string {
  if (row != null) {
    if (row.chi_name.trim() !== "") return row.chi_name.trim();
    if (row.eng_name.trim() !== "") return row.eng_name.trim();
  }
  return courseCode;
}

function trimOrNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

/** Chinese-first string for legacy `suggestedInstructor` consumers. */
function legacySuggestedInstructor(s: InstructorSuggestion): string | null {
  const eng = s.nameEng?.trim() ?? "";
  const chi = s.nameChi?.trim() ?? "";
  const raw = s.rawText?.trim() ?? "";
  if (chi !== "") return chi;
  if (eng !== "") return eng;
  return raw !== "" ? raw : null;
}

function buildMeta(
  title: string,
  suggestion: InstructorSuggestion | null,
): ResolvedCourseMeta {
  return {
    title,
    instructorSuggestion: suggestion,
    suggestedInstructor:
      suggestion != null ? legacySuggestedInstructor(suggestion) : null,
  };
}

/**
 * Admin course-section helper: authoritative Chinese-first title from `courses`, and a single
 * high-confidence instructor suggestion from legacy timetables or marks (never ambiguous).
 */
export async function resolveCourseMeta(
  courseCodeRaw: string,
): Promise<ResolvedCourseMeta | null> {
  const course_code = courseCodeRaw.trim();
  if (course_code === "") return null;

  const courseRow = await selectCourseNamesByCode(course_code);
  const title = titleFromCourseRow(courseRow, course_code);

  const timetableIds = await selectDistinctTimetableInstructorIdsForCourse(
    course_code,
  );
  if (timetableIds.length === 1) {
    const instructorId = timetableIds[0]!;
    const row = await selectInstructorNamesByInstructorId(instructorId);
    const nameChi = row != null ? trimOrNull(row.name_chi) : null;
    const nameEng = row != null ? trimOrNull(row.name_eng) : null;
    const rawText =
      nameChi == null && nameEng == null ? instructorId.trim() || null : null;
    const suggestion: InstructorSuggestion = {
      source: "timetable",
      instructorId,
      nameEng,
      nameChi,
      rawText,
    };
    if (nameChi != null || nameEng != null || rawText != null) {
      return buildMeta(title, suggestion);
    }
  }

  const marksNames = await selectDistinctMarksInstructorsForCourse(course_code);
  if (marksNames.length === 1) {
    const raw = marksNames[0]!.trim();
    const suggestion: InstructorSuggestion = {
      source: "marks",
      instructorId: null,
      nameEng: null,
      nameChi: null,
      rawText: raw !== "" ? raw : null,
    };
    return buildMeta(title, suggestion);
  }

  return buildMeta(title, null);
}
