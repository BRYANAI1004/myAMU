import { pool } from "../lib/db.js";
import { listLegacyRegistrationTermsForStudent } from "../repositories/studentLegacyAccountRepository.js";
import { detectStudentRecordQuestion, extractCourseCode, } from "./studentAiQuestionRouter.js";
import { getStudentAcademicsPayload } from "./studentAcademicsService.js";
import { termsMatch } from "./studentAcademicCourseRecords.js";
function createLoader(studentId) {
    return { studentId: studentId.trim() };
}
async function getAcademics(loader) {
    if (loader.academicsPromise == null) {
        loader.academicsPromise = getStudentAcademicsPayload(loader.studentId);
    }
    return loader.academicsPromise;
}
async function getRegistrationTerms(loader) {
    if (loader.registrationTermsPromise == null) {
        loader.registrationTermsPromise = listLegacyRegistrationTermsForStudent(pool, loader.studentId);
    }
    return loader.registrationTermsPromise;
}
function formatTermLabel(term, year) {
    const t = term.trim();
    return t === "" ? String(year) : `${t} ${year}`;
}
function normalizeCourseCode(courseCode) {
    return courseCode.replace(/[\s-]+/g, "").trim().toUpperCase();
}
function formatCourseLabel(record) {
    const code = record.courseCode.trim();
    const title = record.courseTitle.trim();
    const section = record.sectionCode?.trim() ?? "";
    const base = code && title ? `${code} - ${title}` : code || title || "Unknown course";
    return section !== "" ? `${base} (section ${section})` : base;
}
function roundTwo(value) {
    return Math.round(value * 100) / 100;
}
function sumCredits(records) {
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
function getCurrentTermCourseRecords(academics) {
    const currentTerm = academics.currentTerm;
    if (currentTerm == null)
        return [];
    const sameTerm = academics.courseRecords.filter((record) => record.year === currentTerm.year && termsMatch(record.term, currentTerm.term));
    const activePortal = sameTerm.filter((record) => record.source === "portal" && record.status === "active");
    if (activePortal.length > 0) {
        return activePortal;
    }
    return sameTerm.filter((record) => record.status === "active");
}
export async function getCurrentTermCourses(studentId) {
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
export async function getCurrentTermCourseCount(studentId) {
    const courses = await getCurrentTermCourses(studentId.trim());
    return courses.length;
}
export async function getRegisteredTerms(studentId) {
    return listLegacyRegistrationTermsForStudent(pool, studentId.trim());
}
export async function getRegisteredTermCount(studentId) {
    const terms = await getRegisteredTerms(studentId.trim());
    return terms.length;
}
export async function hasRegistrationInYear(studentId, year) {
    const terms = await getRegisteredTerms(studentId.trim());
    return terms.some((item) => item.year === year);
}
export async function getCurrentTermCredits(studentId) {
    const courses = await getCurrentTermCourses(studentId.trim());
    return sumCredits(courses);
}
export async function hasCompletedCourse(studentId, courseCode) {
    const academics = await getStudentAcademicsPayload(studentId.trim());
    const wanted = normalizeCourseCode(courseCode);
    return academics.courseRecords.some((record) => record.source === "marks" &&
        record.status === "completed" &&
        normalizeCourseCode(record.courseCode) === wanted);
}
export async function getWithdrawalHistory(studentId) {
    const academics = await getStudentAcademicsPayload(studentId.trim());
    const seen = new Set();
    const history = academics.courseRecords.filter((record) => record.status === "withdrawn");
    return history.filter((record) => {
        const key = [
            normalizeCourseCode(record.courseCode),
            record.term.trim().toLowerCase(),
            String(record.year),
            record.source,
        ].join("|");
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function buildCurrentTermCoursesAnswer(question, academics, records) {
    const currentTerm = academics.currentTerm;
    if (currentTerm == null) {
        return {
            result: {
                question,
                answer: "I couldn't identify an active current term in your academic records, so I can't list current-term courses reliably.",
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
function buildCurrentTermCourseCountAnswer(question, academics, records) {
    const currentTerm = academics.currentTerm;
    if (currentTerm == null) {
        return {
            result: {
                question,
                answer: "I couldn't identify an active current term in your academic records, so I can't count current-term courses reliably.",
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
function buildCurrentTermCreditsAnswer(question, academics, records) {
    const currentTerm = academics.currentTerm;
    if (currentTerm == null) {
        return {
            result: {
                question,
                answer: "I couldn't identify an active current term in your academic records, so I can't calculate your current credit load reliably.",
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
                answer: `I found ${records.length} active current-term course${records.length === 1 ? "" : "s"} in ${formatTermLabel(currentTerm.term, currentTerm.year)}, but their credit values are not fully available in the current record snapshot.`,
                sources: [],
            },
            usedHelpers: ["getCurrentTermCredits"],
        };
    }
    ;
    return {
        result: {
            question,
            answer: `You are currently taking ${credits} credit${credits === 1 ? "" : "s"} in ${formatTermLabel(currentTerm.term, currentTerm.year)}.`,
            sources: [],
        },
        usedHelpers: ["getCurrentTermCredits"],
    };
}
function buildRegisteredTermCountAnswer(question, terms) {
    if (terms.length === 0) {
        return {
            result: {
                question,
                answer: "I did not find any legacy registration term records for your account.",
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
function buildRegistrationInYearAnswer(question, year, terms) {
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
function buildWithdrawalHistoryAnswer(question, history) {
    if (history.length === 0) {
        return {
            result: {
                question,
                answer: "I did not find any explicit withdrawal records in your available academic history.",
                sources: [],
            },
            usedHelpers: ["getWithdrawalHistory"],
        };
    }
    const items = history
        .slice(0, 8)
        .map((record) => `${formatCourseLabel(record)} in ${formatTermLabel(record.term, record.year)}`)
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
function buildCompletedCourseAnswer(question, courseCode, academics) {
    const wanted = normalizeCourseCode(courseCode);
    const match = academics.courseRecords.find((record) => record.source === "marks" &&
        record.status === "completed" &&
        normalizeCourseCode(record.courseCode) === wanted);
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
function buildCompletedCreditsTotalAnswer(question) {
    return {
        result: {
            question,
            answer: "I can calculate your current-term credit load exactly, but I am not returning an all-time completed-credit total here because that would require additional earned-credit rules for repeats and credit counting that are not yet defined in this endpoint.",
            sources: [],
        },
        usedHelpers: [],
    };
}
export async function answerDeterministicStudentRecordQuestion(studentId, question) {
    const match = detectStudentRecordQuestion(question);
    if (match == null)
        return null;
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
function buildCurrentTermFacts(academics) {
    const lines = [];
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
        lines.push(`- Current courses: ${currentRecords.map((record) => formatCourseLabel(record)).join("; ")}`);
    }
    return lines;
}
function buildWithdrawalFacts(history) {
    if (history.length === 0) {
        return ["- Withdrawal records: None found"];
    }
    return [
        `- Withdrawal records found: ${history.length}`,
        `- Withdrawal details: ${history
            .slice(0, 8)
            .map((record) => `${formatCourseLabel(record)} in ${formatTermLabel(record.term, record.year)}`)
            .join("; ")}`,
    ];
}
function buildRegisteredTermFacts(terms) {
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
function buildCompletedCourseFacts(courseCode, academics) {
    const wanted = normalizeCourseCode(courseCode);
    const match = academics.courseRecords.find((record) => record.source === "marks" &&
        record.status === "completed" &&
        normalizeCourseCode(record.courseCode) === wanted);
    if (match == null) {
        return [`- Completed ${wanted}: No completed transcript record found`];
    }
    const gradeText = match.grade?.trim() ? ` with grade ${match.grade.trim()}` : "";
    return [
        `- Completed ${wanted}: Yes, in ${formatTermLabel(match.term, match.year)}${gradeText}`,
    ];
}
function needsCurrentTermFacts(question) {
    return /\b(current|this term|now|currently|apply to me|pay attention|record)\b/i.test(question);
}
function needsWithdrawalFacts(question) {
    return /\b(withdraw|withdrawal)\b/i.test(question);
}
function needsRegisteredTermFacts(question) {
    return /\b(register|registered|enroll|enrolled)\b/i.test(question);
}
function pushUnique(lines, newLines) {
    for (const line of newLines) {
        if (!lines.includes(line))
            lines.push(line);
    }
}
export async function buildStudentRecordFactsForQuestion(studentId, question) {
    const loader = createLoader(studentId);
    const lines = ["Student Record Facts"];
    const usedHelpers = new Set();
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
                lines.push("- All-time completed credits are intentionally not computed here because repeat-course credit rules are not yet defined for this endpoint.");
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
//# sourceMappingURL=studentRecordAiService.js.map