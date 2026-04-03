import { DEMO_STUDENT_ID } from "../config/constants.js";
import { pool } from "../lib/db.js";
import { listMarksForStudent } from "../repositories/studentAcademicsRepository.js";
import { findLatestLegacyTermYear, loadLegacyAccountSnapshot, loadLegacyAccountingRows, } from "../repositories/studentLegacyAccountRepository.js";
import { findLatestTermYearForStudent, loadAccountContext, } from "../repositories/studentAccountRepository.js";
import { loadCoursesTranscriptLookup } from "../repositories/studentTranscriptRepository.js";
import { getCatalogDemoAccountPayload } from "./demoAccountService.js";
import { assembleLegacyStudentAccountPayload } from "./studentLegacyAccountAssembler.js";
import { assembleStudentAccountPayload } from "./studentAccountAssembler.js";
async function getDemoStudentAccountPayload(studentId, termYear) {
    let term;
    let year;
    if (termYear.mode === "explicit") {
        term = termYear.term;
        year = termYear.year;
    }
    else {
        const latest = await findLatestTermYearForStudent(pool, studentId);
        if (!latest) {
            return getCatalogDemoAccountPayload("Fall", 2026);
        }
        term = latest.term;
        year = latest.year;
    }
    console.debug("[account-debug] getStudentAccountPayload (demo) input", JSON.stringify({ studentId, term, year, mode: termYear.mode }));
    try {
        const ctx = await loadAccountContext(pool, studentId, term, year);
        if (ctx) {
            return assembleStudentAccountPayload(ctx);
        }
    }
    catch (err) {
        console.warn("[billing] MySQL error for demo-student — using catalog fallback:", err.message);
    }
    return getCatalogDemoAccountPayload(term, year);
}
async function getRealStudentAccountPayload(studentId, termYear) {
    let term;
    let year;
    if (termYear.mode === "explicit") {
        term = termYear.term;
        year = termYear.year;
    }
    else {
        const latest = await findLatestLegacyTermYear(pool, studentId);
        if (!latest) {
            console.debug("[account-debug] getStudentAccountPayload: no legacy registration for auto term", JSON.stringify({ studentId }));
            return null;
        }
        term = latest.term;
        year = latest.year;
    }
    console.debug("[account-debug] getStudentAccountPayload (legacy) input", JSON.stringify({ studentId, term, year, mode: termYear.mode }));
    const snap = await loadLegacyAccountSnapshot(pool, studentId, term, year);
    if (!snap) {
        return null;
    }
    const [accountingRows, allMarksRows, courseLookup] = await Promise.all([
        loadLegacyAccountingRows(pool, studentId, term, year),
        listMarksForStudent(pool, studentId),
        loadCoursesTranscriptLookup(pool),
    ]);
    return assembleLegacyStudentAccountPayload(snap, accountingRows, allMarksRows, courseLookup);
}
export async function getStudentAccountPayload(studentId, termYear) {
    if (studentId === DEMO_STUDENT_ID) {
        return getDemoStudentAccountPayload(studentId, termYear);
    }
    return getRealStudentAccountPayload(studentId, termYear);
}
//# sourceMappingURL=studentAccountService.js.map