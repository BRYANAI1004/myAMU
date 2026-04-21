import { COURSE_FEEDBACK_CSV_QUESTION_RATING_HEADERS } from "../constants/courseFeedbackCsvColumns.js";
import { pool } from "../lib/db.js";
import { listCourseFeedbackForCourseTermYear } from "../repositories/courseFeedbackRepository.js";
import { getCourseSectionById } from "../repositories/courseSectionRepository.js";
import { resolveCourseMeta } from "./resolveCourseMetaService.js";

function csvEscapeCell(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function compactLowerFilenamePart(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toLowerCase();
}

function alnumFilenamePart(raw: string): string {
  const compact = raw.trim().replace(/\s+/g, "");
  if (compact === "") return "unknown";
  const safe = compact.replace(/[^a-zA-Z0-9]/g, "");
  return safe !== "" ? safe : "unknown";
}

function buildFeedbackFilename(args: {
  courseCode: string;
  sectionCode: string | null;
  term: string;
  year: number;
}): string {
  const code = alnumFilenamePart(args.courseCode);
  const section = alnumFilenamePart(args.sectionCode ?? "");
  const termYear = `${Math.trunc(args.year)}${compactLowerFilenamePart(args.term) || "unknown"}`;
  if (section !== "unknown") return `feedback_${code}_${section}_${termYear}.csv`;
  return `feedback_${code}_${termYear}.csv`;
}

function ratingCsvCell(n: number | null): string {
  if (n == null) return "";
  return String(n);
}

function formatSubmittedAt(v: Date | null): string {
  if (v == null || Number.isNaN(v.getTime())) return "";
  return v.toISOString();
}

const FEEDBACK_CSV_HEADERS = [
  "Feedback #",
  "Course Code",
  "Course Title",
  "Term",
  "Year",
  "Section Code",
  "Track",
  ...COURSE_FEEDBACK_CSV_QUESTION_RATING_HEADERS,
  "Overall Rating",
  "Comment",
  "Submitted At",
] as const;

export type BuildFeedbackCsvForSectionResult =
  | {
      ok: true;
      filename: string;
      csvBody: string;
    }
  | { ok: false; kind: "section_not_found" };

export async function buildFeedbackCsvForSection(
  sectionId: number,
): Promise<BuildFeedbackCsvForSectionResult> {
  const section = await getCourseSectionById(sectionId);
  if (!section) return { ok: false, kind: "section_not_found" };

  const courseCode = section.course_code.trim();
  const term = section.term.trim();
  const year = section.year;
  const sectionCode = section.section_code?.trim() || null;
  const track = section.schedule_track;

  const [feedbackRows, courseMeta] = await Promise.all([
    listCourseFeedbackForCourseTermYear(pool, {
      courseCode,
      term,
      year,
    }),
    resolveCourseMeta(courseCode),
  ]);

  const courseTitle = courseMeta?.title?.trim() || courseCode;
  const lines: string[] = [
    FEEDBACK_CSV_HEADERS.map((h) => csvEscapeCell(h)).join(","),
  ];

  for (let i = 0; i < feedbackRows.length; i += 1) {
    const row = feedbackRows[i]!;
    const values: string[] = [
      String(i + 1),
      courseCode,
      courseTitle,
      term,
      String(year),
      sectionCode ?? "",
      track,
      ratingCsvCell(row.q1_rating),
      ratingCsvCell(row.q2_rating),
      ratingCsvCell(row.q3_rating),
      ratingCsvCell(row.q4_rating),
      ratingCsvCell(row.q5_rating),
      ratingCsvCell(row.overall_rating),
      row.comment ?? "",
      formatSubmittedAt(row.submitted_at),
    ];
    lines.push(values.map(csvEscapeCell).join(","));
  }

  return {
    ok: true,
    filename: buildFeedbackFilename({
      courseCode,
      sectionCode,
      term,
      year,
    }),
    csvBody: lines.join("\r\n"),
  };
}
