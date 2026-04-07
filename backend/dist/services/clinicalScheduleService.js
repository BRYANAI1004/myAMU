import { insertClinicalAssignment, listStudentClinicalAssignments, } from "../repositories/clinicalScheduleRepository.js";
/** Thrown when `getStudentClinicalSchedule` receives an invalid student id (maps to HTTP 400). */
export class ClinicalScheduleValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ClinicalScheduleValidationError";
    }
}
function rowToDto(r) {
    return {
        id: r.id,
        studentId: r.student_id,
        courseCode: r.course_code,
        sessionDate: r.session_date,
        sessionName: r.session_name,
        site: r.site,
        faculty: r.faculty,
        status: r.status,
    };
}
export async function getStudentClinicalSchedule(studentId) {
    const sid = String(studentId ?? "").trim();
    if (sid === "") {
        throw new ClinicalScheduleValidationError("Student id is required");
    }
    const rows = await listStudentClinicalAssignments(sid);
    return rows.map(rowToDto);
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function isValidCalendarDate(ymd) {
    if (!ISO_DATE.test(ymd))
        return false;
    const [y, m, d] = ymd.split("-").map((x) => Number(x));
    const dt = new Date(y, m - 1, d);
    return (dt.getFullYear() === y &&
        dt.getMonth() === m - 1 &&
        dt.getDate() === d);
}
export async function assignClinicalSession(body) {
    const studentId = String(body.studentId ?? "").trim();
    const courseCode = String(body.courseCode ?? "").trim();
    const sessionDate = String(body.sessionDate ?? "").trim();
    if (studentId === "") {
        return { ok: false, error: "studentId is required", status: 400 };
    }
    if (courseCode === "") {
        return { ok: false, error: "courseCode is required", status: 400 };
    }
    if (sessionDate === "") {
        return { ok: false, error: "sessionDate is required", status: 400 };
    }
    if (!isValidCalendarDate(sessionDate)) {
        return {
            ok: false,
            error: "sessionDate must be a valid YYYY-MM-DD date",
            status: 400,
        };
    }
    const opt = (v) => {
        if (v === undefined)
            return null;
        if (v === null)
            return null;
        const s = String(v).trim();
        return s === "" ? null : s;
    };
    let statusForDb;
    if (body.status !== undefined && body.status !== null) {
        const t = String(body.status).trim();
        if (t !== "") {
            statusForDb = t;
        }
    }
    const payload = {
        studentId,
        courseCode,
        sessionDate,
        sessionName: opt(body.sessionName),
        site: opt(body.site),
        faculty: opt(body.faculty),
        ...(statusForDb !== undefined ? { status: statusForDb } : {}),
    };
    try {
        const id = await insertClinicalAssignment(payload);
        return { ok: true, id };
    }
    catch (e) {
        console.error(e);
        return {
            ok: false,
            error: "Failed to create clinical assignment",
            status: 500,
        };
    }
}
//# sourceMappingURL=clinicalScheduleService.js.map