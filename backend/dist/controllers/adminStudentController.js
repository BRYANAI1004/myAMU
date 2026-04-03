import { listAdminStudents } from "../services/adminStudentService.js";
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
//# sourceMappingURL=adminStudentController.js.map