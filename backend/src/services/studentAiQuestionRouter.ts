export type StudentAiIntent = "student_record" | "policy" | "mixed";

export type StudentRecordQuestionKind =
  | "current_term_courses"
  | "current_term_course_count"
  | "current_term_credits"
  | "registered_term_count"
  | "registration_in_year"
  | "withdrawal_history"
  | "completed_course"
  | "completed_credits_total";

export type StudentRecordQuestionMatch =
  | { kind: "current_term_courses" }
  | { kind: "current_term_course_count" }
  | { kind: "current_term_credits" }
  | { kind: "registered_term_count" }
  | { kind: "registration_in_year"; year: number }
  | { kind: "withdrawal_history" }
  | { kind: "completed_course"; courseCode: string }
  | { kind: "completed_credits_total" };

const COURSE_CODE_RE = /\b([A-Za-z]{2,5})[\s-]?(\d{3}[A-Za-z]?)\b/;
const YEAR_RE = /\b(19|20)\d{2}\b/;

function lower(text: string): string {
  return text.trim().toLowerCase();
}

function hasPersonalRecordCue(value: string): boolean {
  return /\b(i|me|my|mine|am i|do i|did i|have i|for me)\b/i.test(value);
}

function hasPolicyCue(value: string): boolean {
  return /\b(policy|handbook|catalog|rule|rules|requirement|requirements|deadline|deadlines|prerequisite|prerequisites|graduation|attendance|probation|refund|withdrawal policy|add\/drop|registration policy)\b/i.test(
    value,
  );
}

function hasMixedApplicabilityCue(value: string): boolean {
  return /\b(apply to me|apply in my case|how does it apply to me|based on my current record|based on my record|what should i pay attention to|for my situation|given my record)\b/i.test(
    value,
  );
}

export function extractCourseCode(question: string): string | null {
  const match = COURSE_CODE_RE.exec(question);
  if (match == null) return null;
  return `${match[1]}${match[2]}`.toUpperCase();
}

function extractYear(question: string): number | null {
  const match = YEAR_RE.exec(question);
  if (match == null) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : null;
}

export function detectStudentRecordQuestion(
  question: string,
): StudentRecordQuestionMatch | null {
  const normalized = lower(question);
  const courseCode = extractCourseCode(question);
  const year = extractYear(question);

  if (
    /\b(what|which)\s+(courses|classes)\s+(am i|i am|i'm)\s+(taking|enrolled in)\b/i.test(
      normalized,
    ) ||
    /\bwhat\s+am\s+i\s+taking\s+(this term|now|currently)\b/i.test(normalized)
  ) {
    return { kind: "current_term_courses" };
  }

  if (
    /\bhow\s+many\s+(courses|classes)\s+(am i|i am|i'm)\s+(taking|enrolled in)\b/i.test(
      normalized,
    ) ||
    /\bhow\s+many\s+(courses|classes)\s+am\s+i\s+taking\s+(this term|now|currently)\b/i.test(
      normalized,
    )
  ) {
    return { kind: "current_term_course_count" };
  }

  if (
    /\bhow\s+many\s+credits\s+(am i|i am|i'm)\s+(taking|enrolled in)\b/i.test(
      normalized,
    ) ||
    /\bhow\s+many\s+credits\s+am\s+i\s+taking\s+(this term|now|currently)\b/i.test(
      normalized,
    ) ||
    /\bwhat\s+is\s+my\s+current\s+credit\s+load\b/i.test(normalized)
  ) {
    return { kind: "current_term_credits" };
  }

  if (
    /\bhow\s+many\s+terms\s+(have i|i have|i've)\s+(registered|enrolled)\b/i.test(
      normalized,
    ) ||
    /\bhow\s+many\s+registered\s+terms\s+do\s+i\s+have\b/i.test(normalized)
  ) {
    return { kind: "registered_term_count" };
  }

  if (
    year != null &&
    /\b(did i|have i|was i|do i)\s+(register|registered|enroll|enrolled)\b/i.test(
      normalized,
    )
  ) {
    return { kind: "registration_in_year", year };
  }

  if (
    /\b(do i|did i|have i|my)\b/i.test(normalized) &&
    /\b(withdrawal|withdrawn|withdrew)\b/i.test(normalized)
  ) {
    return { kind: "withdrawal_history" };
  }

  if (
    courseCode != null &&
    /\b(have i|did i|do i)\b/i.test(normalized) &&
    /\b(complete|completed|pass|passed|finish|finished)\b/i.test(normalized)
  ) {
    return { kind: "completed_course", courseCode };
  }

  if (
    /\bhow\s+many\s+credits\s+do\s+i\s+have\b/i.test(normalized) ||
    /\bhow\s+many\s+credits\s+(have i|i have|i've)\s+completed\b/i.test(
      normalized,
    ) ||
    /\bhow\s+many\s+earned\s+credits\s+do\s+i\s+have\b/i.test(normalized)
  ) {
    return { kind: "completed_credits_total" };
  }

  return null;
}

export function classifyStudentAiIntent(question: string): StudentAiIntent {
  const normalized = lower(question);
  const recordMatch = detectStudentRecordQuestion(question);
  const policyCue = hasPolicyCue(normalized);
  const personalCue = hasPersonalRecordCue(normalized);
  const mixedApplicabilityCue = hasMixedApplicabilityCue(normalized);
  const courseCode = extractCourseCode(question);
  const canITakeCourse =
    courseCode != null &&
    /\bcan\s+i\s+take\b/i.test(normalized) &&
    /\b(next term|next semester|this term|now|currently|later)\b/i.test(normalized);

  if (
    canITakeCourse ||
    mixedApplicabilityCue ||
    (policyCue && (recordMatch != null || personalCue))
  ) {
    return "mixed";
  }

  if (recordMatch != null) {
    return "student_record";
  }

  return "policy";
}
