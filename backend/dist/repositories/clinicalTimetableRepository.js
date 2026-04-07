import { pool } from "../lib/db.js";
function mapTimetableRow(r) {
    const row = r;
    const tf = row.time_from;
    const tt = row.time_to;
    const asTime = (v) => {
        if (v instanceof Date) {
            const h = v.getUTCHours();
            const m = v.getUTCMinutes();
            const s = v.getUTCSeconds();
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }
        return String(v ?? "").trim();
    };
    return {
        id: Number(row.id),
        year: Number(row.year),
        term: String(row.term ?? "").trim(),
        weekday: String(row.weekday ?? "").trim(),
        time_from: asTime(tf),
        time_to: asTime(tt),
        slot: String(row.slot ?? "").trim(),
        instructor_id: String(row.instructor_id ?? "").trim(),
        instructor: String(row.instructor ?? "").trim(),
    };
}
/**
 * Optional filters: when `year` or `term` is null/undefined, that filter is skipped.
 */
export async function listClinicTimetableSlots(options) {
    const y = options?.year;
    const t = options?.term != null ? String(options.term).trim() : "";
    const yearClause = y != null && Number.isFinite(y) ? " AND year = ? " : "";
    const termClause = t !== "" ? " AND TRIM(term) = TRIM(?) " : "";
    const params = [];
    if (y != null && Number.isFinite(y)) {
        params.push(Number(y));
    }
    if (t !== "") {
        params.push(t);
    }
    const [rows] = await pool.query(`SELECT seqNum AS id, year, term, day AS weekday,
            time_from, time_to, slot, instructor_id, instructor
       FROM clinic_timetable
      WHERE 1=1
      ${yearClause}
      ${termClause}
      ORDER BY year DESC, term ASC, weekday ASC, time_from ASC, seqNum ASC`, params);
    return rows.map(mapTimetableRow);
}
export async function getClinicTimetableById(seqNum) {
    if (!Number.isFinite(seqNum) || seqNum <= 0) {
        return null;
    }
    const [rows] = await pool.query(`SELECT seqNum AS id, year, term, day AS weekday,
            time_from, time_to, slot, instructor_id, instructor
       FROM clinic_timetable
      WHERE seqNum = ?
      LIMIT 1`, [seqNum]);
    if (rows.length === 0) {
        return null;
    }
    return mapTimetableRow(rows[0]);
}
//# sourceMappingURL=clinicalTimetableRepository.js.map