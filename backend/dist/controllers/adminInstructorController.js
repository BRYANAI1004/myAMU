import { env } from "../config/env.js";
import { listAdminInstructors } from "../services/adminInstructorService.js";
function devMessage(e) {
    return e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
}
/**
 * GET /api/admin/instructors
 */
export async function getAdminInstructorsHandler(_req, res) {
    try {
        const instructors = await listAdminInstructors();
        res.json(instructors);
    }
    catch (e) {
        console.error("[admin/instructors] list failed:", e);
        const body = {
            error: "Failed to load instructors",
        };
        if (env.nodeEnv === "development") {
            body.message = devMessage(e);
        }
        res.status(500).json(body);
    }
}
//# sourceMappingURL=adminInstructorController.js.map