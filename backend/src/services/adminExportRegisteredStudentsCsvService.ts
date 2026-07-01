import { env } from "../config/env.js";
import { pool } from "../lib/db.js";
import { getAcademicTermByCalendarTerm } from "../repositories/academicTermRepository.js";
import { getCourseSectionById } from "../repositories/courseSectionRepository.js";
import { listAdminEnrollmentRowsForSection } from "../repositories/studentEnrollmentRepository.js";
import { mapLegacyStudentProfileExportRowsById } from "../repositories/studentLegacyAccountRepository.js";

/**
 * Portal registrations are section-keyed when `portal_enrollments.course_section_id` is set.
 * This export uses the same filtered roster as GET /api/admin/course-sections/enrollments with
 * `section_id` = the requested `course_sections.id` (plus legacy course-level rows on the canonical
 * MIN(section id) for that course when applicable). The `sectionId` argument resolves course_code /
 * term / year for the filename (`registeredstudent_<code>_<year><termlower>.csv`).
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

/** Course code in download name: trim, strip whitespace, keep A–Z / a–z / 0–9 only (case preserved). */
function courseCodeForRegisteredStudentFilename(raw: string): string {
  const compact = raw.trim().replace(/\s+/g, "");
  if (compact === "") return "unknown";
  const safe = compact.replace(/[^a-zA-Z0-9]/g, "");
  return safe !== "" ? safe : "unknown";
}

/** Term in download name: trim, remove spaces, lowercase (filename only). */
function termLowerCompactForFilename(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toLowerCase();
}

/** `registeredstudent_<COURSECODE>_<YEAR><termlower>.csv` (e.g. registeredstudent_AC102_2026fall.csv). */
function buildAttachmentFilename(args: {
  courseCode: string;
  term: string;
  year: number;
}): string {
  const code = courseCodeForRegisteredStudentFilename(args.courseCode);
  const year = String(Math.trunc(args.year));
  const termPart = termLowerCompactForFilename(args.term);
  const suffix = termPart !== "" ? `${year}${termPart}` : `${year}unknown`;
  return `registeredstudent_${code}_${suffix}.csv`;
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
  "Grade",
] as const;

/** Exposed so the HTTP handler can log the same header list that was used to build the CSV. */
export const REGISTERED_STUDENTS_CSV_HEADERS: readonly string[] = CSV_HEADERS;

const CSV_FIRST_LINE_MARKER = "Student ID";

export type BuildRegisteredStudentsCsvResult =
  | {
      ok: true;
      filename: string;
      /** UTF-8 text without BOM (caller may prepend BOM for Excel). */
      csvBody: string;
      /** Populated in development only: unescaped cells for the first data row (same order as headers). */
      devDiagnostic?: {
        headerLabels: readonly string[];
        firstFlattenedRow: string[];
        csvFirstLine: string;
      };
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

  const termRow = await getAcademicTermByCalendarTerm(term, year);
  if (termRow == null) {
    return { ok: false, kind: "section_not_found" };
  }

  const enrollments = await listAdminEnrollmentRowsForSection(
    courseCode,
    termRow.id,
    { courseSectionId: sectionId },
  );
  const studentIds = enrollments
    .map((e) => e.studentId.trim())
    .filter((id) => id !== "");

  const profiles = await mapLegacyStudentProfileExportRowsById(pool, studentIds);

  const lines: string[] = [];
  const headerLine = CSV_HEADERS.map((h) => csvEscapeCell(h)).join(",");
  lines.push(headerLine);

  let firstFlattenedRow: string[] | undefined;

  for (const row of enrollments) {
    const sid = row.studentId.trim();
    if (sid === "") continue;
    const legacy = profiles.get(sid);
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

    const values: string[] = [
      sid,
      divisionFromStudentId(sid),
      displayName,
      cell(legacy?.gender),
      cell(legacy?.email),
      cell(legacy?.program),
      cell(legacy?.highestDegree),
      cell(legacy?.backgroundSchool),
      gradeCell,
    ];
    lines.push(values.map(csvEscapeCell).join(","));
    if (firstFlattenedRow === undefined) {
      firstFlattenedRow = values;
    }
  }

  const csvBody = lines.join("\r\n");

  if (env.nodeEnv === "development") {
    if (!headerLine.includes(CSV_FIRST_LINE_MARKER)) {
      console.error(
        "[adminExportRegisteredStudentsCsv] CSV header line missing per-question columns (wrong service or stale build?)",
        { headerLine },
      );
    }
  }

  const filename = buildAttachmentFilename({
    courseCode: section.course_code,
    term: section.term,
    year: section.year,
  });

  return {
    ok: true,
    filename,
    csvBody,
    ...(env.nodeEnv === "development" && firstFlattenedRow !== undefined
      ? {
          devDiagnostic: {
            headerLabels: CSV_HEADERS,
            firstFlattenedRow,
            csvFirstLine: headerLine,
          },
        }
      : {}),
  };
}
