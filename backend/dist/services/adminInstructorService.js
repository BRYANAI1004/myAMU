import { listInstructors } from "../repositories/instructorRepository.js";
export async function listAdminInstructors() {
    const rows = await listInstructors();
    return rows.map((row) => ({
        id: row.sequenceNumber,
        instructorId: row.instructor_id,
        name: row.display_name,
    }));
}
//# sourceMappingURL=adminInstructorService.js.map