import { pool } from "../lib/db.js";
import { listLegacyRegistrationTermsForStudent } from "../repositories/studentLegacyAccountRepository.js";
import { type RagAnswerResult } from "./ragService.js";
import {
  detectStudentRecordQuestion,
  extractCourseCode,
} from "./studentAiQuestionRouter.js";
import { getStudentAcademicsPayload } from "./studentAcademicsService.js";
import { termsMatch } from "./studentAcademicCourseRecords.js";
import type {
  StudentAcademicCourseRecord,
  StudentAcademicsResponse,
} from "../types/studentAcademics.js";

type TermYear = { term: string; year: number };

type StudentRecordDataLoader = {
  studentId: string;
  academicsPromise?: Promise<StudentAcademicsResponse>;
  registrationTermsPromise?: Promise<TermYear[]>;
};

export type StudentRecordAnswerResult = {
  result: RagAnswerResult;
  usedHelpers: string[];
};

export type StudentRecordFactsResult = {
  contextText: string;
  usedHelpers: string[];
};

function createLoader(studentId: string): StudentRecordDataLoader {
  return { studentId: studentId.trim() };
}

async function getAcademics(
  loader: StudentRecordDataLoader,
): Promise<StudentAcademicsResponse> {
  if (loader.academicsPromise == null) {
    loader.academicsPromise = getStudentAcademicsPayload(loader.studentId);
  }
  return loader.academicsPromise;
}

async function getRegistrationTerms(loader: StudentRecordDataLoader): Promise<TermYear[]> {
  if (loader.registrationTermsPromise == null) {
    loader.registrationTermsPromise = listLegacyRegistrationTermsForStudent(
      pool,
      loader.studentId,
    );
  }
  return loader.registrationTermsPromise;
}

function formatTermLabel(term: string, year: number): string {
  const t = term.trim();
  return t === "" ? String(year) : `${t} ${year}`;
}

function normalizeCourseCode(courseCode: string): string {
  return courseCode.replace(/[\s-]+/g, "").trim().toUpperCase();
}

function formatCourseLabel(record: {
  courseCode: string;
  courseTitle: string;
  sectionCode?: string | null;
}): string {
  const code = record.courseCode.trim();
  const title = record.courseTitle.trim();
  const section = record.sectionCode?.trim() ?? "";
  const base = code && title ? `${code} - ${title}` : code || title || "Unknown course";
  return section !== "" ? `${base} (section ${section})` : base;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumCredits(
  records: Array<{ credits: number | null }>,
): number | null {
  let total = 0;
  let found = false;
  for (const record of records) {
    if (record.credits != null && Number.isFinite(record.credits)) {
      total += record.credits;
      found = true;
    }
  }
  return found ? roundTwo(total) : null;
}

function getCurrentTermCourseRecords(
  academics: StudentAcademicsResponse,
): StudentAcademicCourseRecord[] {
  const currentTerm = academics.currentTerm;
  if (currentTerm == null) return [];

  const sameTerm = academics.courseRecords.filter(
    (record) =>
      record.year === currentTerm.year && termsMatch(record.term, currentTerm.term),
  );

  const activePortal = sameTerm.filter(
    (record) => record.source === "portal" && record.status === "active",
  );
  if (activePortal.length > 0) {
    return activePortal;
  }

  return sameTerm.filter((record) => record.status === "active");
}

export async function getCurrentTermCourses(studentId: string) {
  const academics = await getStudentAcademicsPayload(studentId.trim());
  return getCurrentTermCourseRecords(academics).map((record) => ({
    courseCode: record.courseCode,
    courseTitle: record.courseTitle,
    term: record.term,
    year: record.year,
    credits: record.credits,
    sectionCode: record.sectionCode ?? null,
  }));
}

export async function getCurrentTermCourseCount(studentId: string): Promise<number> {
  const courses = await getCurrentTermCourses(studentId.trim());
  return courses.length;
}

export async function getRegisteredTerms(studentId: string): Promise<TermYear[]> {
  return listLegacyRegistrationTermsForStudent(pool, studentId.trim());
}

export async function getRegisteredTermCount(studentId: string): Promise<number> {
  const terms = await getRegisteredTerms(studentId.trim());
  return terms.length;
}

export async function hasRegistrationInYear(
  studentId: string,
  year: number,
): Promise<boolean> {
  const terms = await getRegisteredTerms(studentId.trim());
  return terms.some((item) => item.year === year);
}

export async function getCurrentTermCredits(studentId: string): Promise<number | null> {
  const courses = await getCurrentTermCourses(studentId.trim());
  return sumCredits(courses);
}

export async function hasCompletedCourse(
  studentId: string,
  courseCode: string,
): Promise<boolean> {
  const academics = await getStudentAcademicsPayload(studentId.trim());
  const wanted = normalizeCourseCode(courseCode);
  return academics.courseRecords.some(
    (record) =>
      record.source === "marks" &&
      record.status === "completed" &&
      normalizeCourseCode(record.courseCode) === wanted,
  );
}

export async function getWithdrawalHistory(studentId: string) {
  const academics = await getStudentAcademicsPayload(studentId.trim());
  const seen = new Set<string>();
  const history = academics.courseRecords.filter((record) => record.status === "withdrawn");
  return history.filter((record) => {
    const key = [
      normalizeCourseCode(record.courseCode),
      record.term.trim().toLowerCase(),
      String(record.year),
      record.source,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCurrentTermCoursesAnswer(
  question: string,
  academics: StudentAcademicsResponse,
  records: StudentAcademicCourseRecord[],
): StudentRecordAnswerResult {
  const currentTerm = academics.currentTerm;
  if (currentTerm == null) {
    return {
      result: {
        question,
        answer:
          "I don't have enough information from your records to confirm your current-term courses.",
        sources: [],
      },
      usedHelpers: ["getCurrentTermCourses"],
    };
  }

  const termLabel = formatTermLabel(currentTerm.term, currentTerm.year);
  if (records.length === 0) {
    return {
      result: {
        question,
        answer: `I did not find any active current-term enrollments for ${termLabel}.`,
        sources: [],
      },
      usedHelpers: ["getCurrentTermCourses"],
    };
  }

  const courseList = records.map((record) => formatCourseLabel(record)).join("; ");
  return {
    result: {
      question,
      answer: `You are currently taking ${records.length} course${records.length === 1 ? "" : "s"} in ${termLabel}: ${courseList}.`,
      sources: [],
    },
    usedHelpers: ["getCurrentTermCourses"],
  };
}

function buildCurrentTermCourseCountAnswer(
  question: string,
  academics: StudentAcademicsResponse,
  records: StudentAcademicCourseRecord[],
): StudentRecordAnswerResult {
  const currentTerm = academics.currentTerm;
  if (currentTerm == null) {
    return {
      result: {
        question,
        answer:
          "I don't have enough information from your records to confirm your current-term course count.",
        sources: [],
      },
      usedHelpers: ["getCurrentTermCourseCount"],
    };
  }
  return {
    result: {
      question,
      answer: `You are taking ${records.length} course${records.length === 1 ? "" : "s"} in ${formatTermLabel(currentTerm.term, currentTerm.year)}.`,
      sources: [],
    },
    usedHelpers: ["getCurrentTermCourseCount"],
  };
}

function buildCurrentTermCreditsAnswer(
  question: string,
  academics: StudentAcademicsResponse,
  records: StudentAcademicCourseRecord[],
): StudentRecordAnswerResult {
  const currentTerm = academics.currentTerm;
  if (currentTerm == null) {
    return {
      result: {
        question,
        answer:
          "I don't have enough information from your records to confirm your current credit load.",
        sources: [],
      },
      usedHelpers: ["getCurrentTermCredits"],
    };
  }
  const credits = sumCredits(records);
  if (records.length === 0) {
    return {
      result: {
        question,
        answer: `I did not find any active current-term enrollments for ${formatTermLabel(currentTerm.term, currentTerm.year)}.`,
        sources: [],
      },
      usedHelpers: ["getCurrentTermCredits"],
    };
  }
  if (credits == null) {
    return {
      result: {
        question,
        answer: `I found ${records.length} active current-term course${records.length === 1 ? "" : "s"} in ${formatTermLabel(currentTerm.term, currentTerm.year)}, but I don't have enough information from your records to confirm the exact credit total.`,
        sources: [],
      },
      usedHelpers: ["getCurrentTermCredits"],
    };
  };
  return {
    result: {
      question,
      answer: `You are currently taking ${credits} credit${credits === 1 ? "" : "s"} in ${formatTermLabel(currentTerm.term, currentTerm.year)}.`,
      sources: [],
    },
    usedHelpers: ["getCurrentTermCredits"],
  };
}

function buildRegisteredTermCountAnswer(
  question: string,
  terms: TermYear[],
): StudentRecordAnswerResult {
  if (terms.length === 0) {
    return {
      result: {
        question,
        answer:
          "I did not find any legacy registration term records for your account.",
        sources: [],
      },
      usedHelpers: ["getRegisteredTerms", "getRegisteredTermCount"],
    };
  }

  const labels = terms.map((term) => formatTermLabel(term.term, term.year)).join("; ");
  return {
    result: {
      question,
      answer: `I found ${terms.length} registered term${terms.length === 1 ? "" : "s"} in your legacy registration history: ${labels}.`,
      sources: [],
    },
    usedHelpers: ["getRegisteredTerms", "getRegisteredTermCount"],
  };
}

function buildRegistrationInYearAnswer(
  question: string,
  year: number,
  terms: TermYear[],
): StudentRecordAnswerResult {
  const matchingTerms = terms.filter((term) => term.year === year);
  if (matchingTerms.length === 0) {
    return {
      result: {
        question,
        answer: `No. I did not find any legacy registration term records for ${year}.`,
        sources: [],
      },
      usedHelpers: ["getRegisteredTerms", "hasRegistrationInYear"],
    };
  }

  const labels = matchingTerms
    .map((term) => formatTermLabel(term.term, term.year))
    .join("; ");
  return {
    result: {
      question,
      answer: `Yes. I found legacy registration records for ${year}: ${labels}.`,
      sources: [],
    },
    usedHelpers: ["getRegisteredTerms", "hasRegistrationInYear"],
  };
}

function buildWithdrawalHistoryAnswer(
  question: string,
  history: StudentAcademicCourseRecord[],
): StudentRecordAnswerResult {
  if (history.length === 0) {
    return {
      result: {
        question,
        answer:
          "I did not find any explicit withdrawal records in your available academic history.",
        sources: [],
      },
      usedHelpers: ["getWithdrawalHistory"],
    };
  }

  const items = history
    .slice(0, 8)
    .map(
      (record) =>
        `${formatCourseLabel(record)} in ${formatTermLabel(record.term, record.year)}`,
    )
    .join("; ");
  return {
    result: {
      question,
      answer: `Yes. I found ${history.length} withdrawal record${history.length === 1 ? "" : "s"}: ${items}.`,
      sources: [],
    },
    usedHelpers: ["getWithdrawalHistory"],
  };
}

function buildCompletedCourseAnswer(
  question: string,
  courseCode: string,
  academics: StudentAcademicsResponse,
): StudentRecordAnswerResult {
  const wanted = normalizeCourseCode(courseCode);
  const match = academics.courseRecords.find(
    (record) =>
      record.source === "marks" &&
      record.status === "completed" &&
      normalizeCourseCode(record.courseCode) === wanted,
  );

  if (match == null) {
    return {
      result: {
        question,
        answer: `No completed transcript record for ${wanted} was found in your available marks history.`,
        sources: [],
      },
      usedHelpers: ["hasCompletedCourse"],
    };
  }

  const gradeText = match.grade?.trim() ? ` with grade ${match.grade.trim()}` : "";
  return {
    result: {
      question,
      answer: `Yes. I found a completed ${wanted} transcript record in ${formatTermLabel(match.term, match.year)}${gradeText}.`,
      sources: [],
    },
    usedHelpers: ["hasCompletedCourse"],
  };
}

function buildCompletedCreditsTotalAnswer(
  question: string,
): StudentRecordAnswerResult {
  return {
    result: {
      question,
      answer:
        "I can calculate your current-term credit load exactly, but I am not returning an all-time completed-credit total here because that would require additional earned-credit rules for repeats and credit counting that are not yet defined in this endpoint.",
      sources: [],
    },
    usedHelpers: [],
  };
}

export async function answerDeterministicStudentRecordQuestion(
  studentId: string,
  question: string,
): Promise<StudentRecordAnswerResult | null> {
  const match = detectStudentRecordQuestion(question);
  if (match == null) return null;

  const loader = createLoader(studentId);

  switch (match.kind) {
    case "current_term_courses": {
      const academics = await getAcademics(loader);
      const records = getCurrentTermCourseRecords(academics);
      return buildCurrentTermCoursesAnswer(question, academics, records);
    }
    case "current_term_course_count": {
      const academics = await getAcademics(loader);
      const records = getCurrentTermCourseRecords(academics);
      return buildCurrentTermCourseCountAnswer(question, academics, records);
    }
    case "current_term_credits": {
      const academics = await getAcademics(loader);
      const records = getCurrentTermCourseRecords(academics);
      return buildCurrentTermCreditsAnswer(question, academics, records);
    }
    case "registered_term_count": {
      const terms = await getRegistrationTerms(loader);
      return buildRegisteredTermCountAnswer(question, terms);
    }
    case "registration_in_year": {
      const terms = await getRegistrationTerms(loader);
      return buildRegistrationInYearAnswer(question, match.year, terms);
    }
    case "withdrawal_history": {
      const history = await getWithdrawalHistory(loader.studentId);
      return buildWithdrawalHistoryAnswer(question, history);
    }
    case "completed_course": {
      const academics = await getAcademics(loader);
      return buildCompletedCourseAnswer(question, match.courseCode, academics);
    }
    case "completed_credits_total":
      return buildCompletedCreditsTotalAnswer(question);
    default:
      return null;
  }
}

function buildCurrentTermFacts(academics: StudentAcademicsResponse): string[] {
  const lines: string[] = [];
  const currentTerm = academics.currentTerm;
  if (currentTerm == null) {
    lines.push("- Current term: Unavailable");
    lines.push("- Current active enrollments: None confirmed");
    return lines;
  }

  const currentRecords = getCurrentTermCourseRecords(academics);
  const credits = sumCredits(currentRecords);
  lines.push(`- Current term: ${formatTermLabel(currentTerm.term, currentTerm.year)}`);
  lines.push(`- Current active enrollments: ${currentRecords.length}`);
  if (credits != null) {
    lines.push(`- Current active credits: ${credits}`);
  }
  if (currentRecords.length > 0) {
    lines.push(
      `- Current courses: ${currentRecords.map((record) => formatCourseLabel(record)).join("; ")}`,
    );
  }
  return lines;
}

function buildWithdrawalFacts(history: StudentAcademicCourseRecord[]): string[] {
  if (history.length === 0) {
    return ["- Withdrawal records: None found"];
  }
  return [
    `- Withdrawal records found: ${history.length}`,
    `- Withdrawal details: ${history
      .slice(0, 8)
      .map(
        (record) =>
          `${formatCourseLabel(record)} in ${formatTermLabel(record.term, record.year)}`,
      )
      .join("; ")}`,
  ];
}

function buildRegisteredTermFacts(terms: TermYear[]): string[] {
  if (terms.length === 0) {
    return ["- Registered terms: None found in legacy registration history"];
  }
  return [
    `- Registered terms found: ${terms.length}`,
    `- Registered term list: ${terms
      .map((term) => formatTermLabel(term.term, term.year))
      .join("; ")}`,
  ];
}

function buildCompletedCourseFacts(
  courseCode: string,
  academics: StudentAcademicsResponse,
): string[] {
  const wanted = normalizeCourseCode(courseCode);
  const match = academics.courseRecords.find(
    (record) =>
      record.source === "marks" &&
      record.status === "completed" &&
      normalizeCourseCode(record.courseCode) === wanted,
  );

  if (match == null) {
    return [`- Completed ${wanted}: No completed transcript record found`];
  }

  const gradeText = match.grade?.trim() ? ` with grade ${match.grade.trim()}` : "";
  return [
    `- Completed ${wanted}: Yes, in ${formatTermLabel(match.term, match.year)}${gradeText}`,
  ];
}

function needsCurrentTermFacts(question: string): boolean {
  return /\b(current|this term|now|currently|apply to me|pay attention|record)\b/i.test(
    question,
  );
}

function needsWithdrawalFacts(question: string): boolean {
  return /\b(withdraw|withdrawal)\b/i.test(question);
}

function needsRegisteredTermFacts(question: string): boolean {
  return /\b(register|registered|enroll|enrolled)\b/i.test(question);
}

function pushUnique(lines: string[], newLines: string[]): void {
  for (const line of newLines) {
    if (!lines.includes(line)) lines.push(line);
  }
}

export async function buildStudentRecordFactsForQuestion(
  studentId: string,
  question: string,
): Promise<StudentRecordFactsResult | null> {
  const loader = createLoader(studentId);
  const lines: string[] = ["Student Record Facts"];
  const usedHelpers = new Set<string>();
  const recordMatch = detectStudentRecordQuestion(question);
  const courseCode = extractCourseCode(question);

  if (recordMatch != null) {
    switch (recordMatch.kind) {
      case "current_term_courses":
      case "current_term_course_count":
      case "current_term_credits": {
        const academics = await getAcademics(loader);
        pushUnique(lines, buildCurrentTermFacts(academics));
        usedHelpers.add("getCurrentTermCourses");
        break;
      }
      case "registered_term_count":
      case "registration_in_year": {
        const terms = await getRegistrationTerms(loader);
        pushUnique(lines, buildRegisteredTermFacts(terms));
        usedHelpers.add("getRegisteredTerms");
        break;
      }
      case "withdrawal_history": {
        const history = await getWithdrawalHistory(loader.studentId);
        pushUnique(lines, buildWithdrawalFacts(history));
        usedHelpers.add("getWithdrawalHistory");
        break;
      }
      case "completed_course": {
        const academics = await getAcademics(loader);
        pushUnique(lines, buildCompletedCourseFacts(recordMatch.courseCode, academics));
        usedHelpers.add("hasCompletedCourse");
        break;
      }
      case "completed_credits_total":
        lines.push(
          "- All-time completed credits are intentionally not computed here because repeat-course credit rules are not yet defined for this endpoint.",
        );
        break;
    }
  }

  if (needsCurrentTermFacts(question)) {
    const academics = await getAcademics(loader);
    pushUnique(lines, buildCurrentTermFacts(academics));
    usedHelpers.add("getCurrentTermCourses");
  }

  if (needsWithdrawalFacts(question)) {
    const history = await getWithdrawalHistory(loader.studentId);
    pushUnique(lines, buildWithdrawalFacts(history));
    usedHelpers.add("getWithdrawalHistory");
  }

  if (needsRegisteredTermFacts(question)) {
    const terms = await getRegistrationTerms(loader);
    pushUnique(lines, buildRegisteredTermFacts(terms));
    usedHelpers.add("getRegisteredTerms");
  }

  if (courseCode != null && /\b(can i take|prereq|prerequisite|completed)\b/i.test(question)) {
    const academics = await getAcademics(loader);
    pushUnique(lines, buildCompletedCourseFacts(courseCode, academics));
    usedHelpers.add("hasCompletedCourse");
  }

  if (lines.length === 1) {
    return null;
  }

  return {
    contextText: lines.join("\n"),
    usedHelpers: [...usedHelpers],
  };
}
