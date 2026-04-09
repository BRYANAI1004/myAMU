import { pool } from "../lib/db.js";
import { mapCourseFeedbackByStudentForCourseTermYear } from "../repositories/courseFeedbackRepository.js";
import { getCourseSectionById } from "../repositories/courseSectionRepository.js";
import { listAdminEnrollmentRowsForSection } from "../repositories/studentEnrollmentRepository.js";
import { mapLegacyStudentProfileExportRowsById } from "../repositories/studentLegacyAccountRepository.js";

/**
 * Portal registrations are stored in `portal_enrollments` at **course + calendar term + year** only.
 * There is no `course_sections.id` (or section_code) on enrollment rows. The admin UI therefore shows
 * the same enrolled roster on every scheduled section row for that course in the term; this export
 * uses the same student list as GET /api/admin/course-sections/enrollments for that course/term/year.
 * The requested `sectionId` is used to resolve course_code / term / year / section metadata for the
 * filename and to anchor the admin action to a concrete timetable row.
 *
 * Course feedback (`course_feedback`) is also keyed by course_code + term + year (not section), with
 * at most one row per student per course/term/year (`uniq_feedback`). We export `overall_rating` and
 * `comment` for that same key — matching the admin “Course feedback” modal.
 *
 * Grades use the same subquery as `listAdminEnrollmentRowsForSection`: latest legacy `marks` row by
 * `seqNumber` for student id + course code + term + year; withdrawn enrollments show `W`.
 */

function divisionFromStudentId(id: string): "Chinese" | "English" | "Unknown" {
  const c = id.trim().charAt(0).toUpperCase();
  if (c === "C") return "Chinese";
  if (c === "E") return "English";
  return "Unknown";
}

function sanitizeFilenamePart(raw: string): string {
  const t = raw.trim();
  if (t === "") return "unknown";
  return t.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function buildAttachmentFilename(args: {
  courseCode: string;
  sectionCode: string;
  term: string;
  year: number;
}): string {
  const course = sanitizeFilenamePart(args.courseCode);
  const section = sanitizeFilenamePart(args.sectionCode);
  const term = sanitizeFilenamePart(args.term);
  const year = sanitizeFilenamePart(String(Math.trunc(args.year)));
  return `registered-students-${course}-${section}-${term}-${year}.csv`;
}

/** RFC 4180-style escaping; newlines normalized to `\n` inside quoted fields; rows joined with `\r\n`. */
function csvEscapeCell(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function cell(v: string | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

const CSV_HEADERS = [
  "Student ID",
  "Division",
  "Name",
  "Gender",
  "Email",
  "Program",
  "Highest Degree",
  "Background School",
  "Feedback Rating",
  "Feedback Comment",
  "Grade",
] as const;

export type BuildRegisteredStudentsCsvResult =
  | {
      ok: true;
      filename: string;
      /** UTF-8 text without BOM (caller may prepend BOM for Excel). */
      csvBody: string;
    }
  | { ok: false; kind: "section_not_found" };

export async function buildRegisteredStudentsCsvForSection(
  sectionId: number,
): Promise<BuildRegisteredStudentsCsvResult> {
  const section = await getCourseSectionById(sectionId);
  if (!section) {
    return { ok: false, kind: "section_not_found" };
  }

  const courseCode = section.course_code.trim();
  const term = section.term.trim();
  const year = section.year;

  const enrollments = await listAdminEnrollmentRowsForSection(
    courseCode,
    term,
    year,
  );
  const studentIds = enrollments
    .map((e) => e.studentId.trim())
    .filter((id) => id !== "");

  const [profiles, feedbackByStudent] = await Promise.all([
    mapLegacyStudentProfileExportRowsById(pool, studentIds),
    mapCourseFeedbackByStudentForCourseTermYear(pool, {
      courseCode,
      term,
      year,
      studentIds,
    }),
  ]);

  const lines: string[] = [];
  lines.push(CSV_HEADERS.map((h) => csvEscapeCell(h)).join(","));

  for (const row of enrollments) {
    const sid = row.studentId.trim();
    if (sid === "") continue;
    const legacy = profiles.get(sid);
    const fb = feedbackByStudent.get(sid);

    const legacyName = legacy?.name ?? "";
    const rosterName = row.name != null ? String(row.name).trim() : "";
    const displayName =
      legacyName !== ""
        ? legacyName
        : rosterName !== ""
          ? rosterName
          : sid;

    const gradeCell =
      row.grade != null && String(row.grade).trim() !== ""
        ? String(row.grade).trim()
        : "";

    const ratingCell =
      fb != null && Number.isFinite(fb.overall_rating)
        ? String(fb.overall_rating)
        : "";

    const commentCell = fb?.comment != null ? fb.comment : "";

    const values: string[] = [
      sid,
      divisionFromStudentId(sid),
      displayName,
      cell(legacy?.gender),
      cell(legacy?.email),
      cell(legacy?.program),
      cell(legacy?.highestDegree),
      cell(legacy?.backgroundSchool),
      ratingCell,
      commentCell,
      gradeCell,
    ];
    lines.push(values.map(csvEscapeCell).join(","));
  }

  const filename = buildAttachmentFilename({
    courseCode: section.course_code,
    sectionCode: section.section_code,
    term: section.term,
    year: section.year,
  });

  return {
    ok: true,
    filename,
    csvBody: lines.join("\r\n"),
  };
}
