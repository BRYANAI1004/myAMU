import { getAdminStudentDetail, listAdminStudents, updateAdminStudent, } from "../services/adminStudentService.js";
function isRecord(v) {
    return v != null && typeof v === "object" && !Array.isArray(v);
}
function trimStr(v) {
    if (v == null)
        return "";
    return String(v).trim();
}
function parseNullableStringField(v) {
    const s = trimStr(v);
    return s === "" ? null : s;
}
function parseUpdateBody(raw) {
    if (!isRecord(raw))
        return null;
    if (typeof raw.name !== "string")
        return null;
    return {
        name: raw.name,
        email: parseNullableStringField(raw.email),
        gender: parseNullableStringField(raw.gender),
        backgroundSchool: parseNullableStringField(raw.backgroundSchool),
        highestDegree: parseNullableStringField(raw.highestDegree),
        requirementsId: parseNullableStringField(raw.requirementsId),
        address: parseNullableStringField(raw.address),
        city: parseNullableStringField(raw.city),
        state: parseNullableStringField(raw.state),
        zip: parseNullableStringField(raw.zip),
        signedDate: parseNullableStringField(raw.signedDate),
        enrollStartDate: parseNullableStringField(raw.enrollStartDate),
    };
}
const STUDENT_ID_PARAM = /^[A-Za-z0-9._-]{1,64}$/;
function normalizeStudentIdParam(raw) {
    const s = raw?.trim() ?? "";
    if (s === "" || !STUDENT_ID_PARAM.test(s))
        return null;
    return s;
}
export async function getAdminStudents(_req, res) {
    try {
        const students = await listAdminStudents();
        res.json({ students });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load students" });
    }
}
function paramStudentId(params) {
    const raw = params.studentId;
    return typeof raw === "string" ? raw : undefined;
}
export async function getAdminStudent(req, res) {
    const studentId = normalizeStudentIdParam(paramStudentId(req.params));
    if (!studentId) {
        res.status(400).json({ error: "Invalid student id." });
        return;
    }
    try {
        const detail = await getAdminStudentDetail(studentId);
        if (!detail) {
            res.status(404).json({ error: "Student not found." });
            return;
        }
        res.json(detail);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load student" });
    }
}
export async function putAdminStudent(req, res) {
    const studentId = normalizeStudentIdParam(paramStudentId(req.params));
    if (!studentId) {
        res.status(400).json({ error: "Invalid student id." });
        return;
    }
    const body = parseUpdateBody(req.body);
    if (!body) {
        res.status(400).json({ error: "Invalid request body." });
        return;
    }
    try {
        const result = await updateAdminStudent(studentId, body);
        if (!result.ok) {
            res.status(result.status).json({ error: result.message });
            return;
        }
        res.json(result.detail);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to update student" });
    }
}
//# sourceMappingURL=adminStudentController.js.map