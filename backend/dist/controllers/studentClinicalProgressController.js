import { env } from "../config/env.js";
import { loadStudentClinicalProgressFromClinic } from "../repositories/studentClinicalProgressRepository.js";
import { pool } from "../lib/db.js";
function parseQueryString(req, key) {
    const raw = req.query[key];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v !== "string")
        return null;
    const t = v.trim();
    return t === "" ? null : t;
}
function devMessage(e) {
    return e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
}
/**
 * GET /api/student/clinical-progress?studentId=
 *
 * Reads passed clinical completions from legacy `clinic` (grade P, raw hours column) and
 * a fixed five-row clinical exam history from the same `clinic` table (code prefix + grade).
 */
export async function getStudentClinicalProgressHandler(req, res) {
    try {
        const studentId = parseQueryString(req, "studentId");
        if (!studentId) {
            res.status(400).json({
                error: "Query parameter studentId is required.",
            });
            return;
        }
        const payload = await loadStudentClinicalProgressFromClinic(pool, studentId);
        res.json(payload);
    }
    catch (e) {
        console.error("[student/clinical-progress] failed:", e);
        const body = {
            error: "Failed to load clinical progress.",
        };
        if (env.nodeEnv === "development")
            body.message = devMessage(e);
        res.status(500).json(body);
    }
}
//# sourceMappingURL=studentClinicalProgressController.js.map