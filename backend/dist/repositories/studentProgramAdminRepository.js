function isProgramCode(s) {
    return s === "MAHM" || s === "DAHM";
}
export async function getStudentProgramAdminByStudentId(pool, studentId) {
    const id = studentId.trim();
    if (id === "")
        return null;
    const [rows] = await pool.query(`SELECT program_code
     FROM student_program_admin
     WHERE student_id = ?
     LIMIT 1`, [id]);
    if (rows.length === 0)
        return null;
    const raw = String(rows[0].program_code ?? "").trim();
    return isProgramCode(raw) ? raw : null;
}
/**
 * Bulk load program codes for many student ids. Unknown or invalid codes are omitted from the map.
 */
export async function getStudentProgramAdminMapForStudentIds(pool, studentIds) {
    const ids = [...new Set(studentIds.map((s) => s.trim()).filter((s) => s !== ""))];
    const out = new Map();
    if (ids.length === 0)
        return out;
    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await pool.query(`SELECT student_id, program_code
     FROM student_program_admin
     WHERE student_id IN (${placeholders})`, ids);
    for (const r of rows) {
        const sid = String(r.student_id ?? "").trim();
        const code = String(r.program_code ?? "").trim();
        if (sid !== "" && isProgramCode(code)) {
            out.set(sid, code);
        }
    }
    return out;
}
export async function upsertStudentProgramAdmin(client, studentId, programCode) {
    const id = studentId.trim();
    if (id === "") {
        throw new Error("upsertStudentProgramAdmin: empty student id");
    }
    await client.execute(`INSERT INTO student_program_admin (student_id, program_code)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       program_code = VALUES(program_code)`, [id, programCode]);
}
//# sourceMappingURL=studentProgramAdminRepository.js.map