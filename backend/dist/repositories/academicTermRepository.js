import { pool } from "../lib/db.js";
function nullableDateString(v) {
    if (v === undefined || v === null)
        return null;
    if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, "0");
        const d = String(v.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
        return s.slice(0, 10);
    return s;
}
function asBool(v) {
    if (typeof v === "boolean")
        return v;
    if (typeof v === "number")
        return v !== 0;
    if (typeof v === "bigint")
        return v !== 0n;
    const s = String(v).toLowerCase();
    return s === "1" || s === "true";
}
function normalizeRow(row) {
    return {
        id: String(row.id ?? ""),
        term_label: String(row.term_label ?? ""),
        year: Number(row.year),
        term_name: row.term_name,
        quarter_index: Number(row.quarter_index),
        sequence_no: Number(row.sequence_no),
        start_date: nullableDateString(row.start_date),
        end_date: nullableDateString(row.end_date),
        registration_open: nullableDateString(row.registration_open),
        registration_close: nullableDateString(row.registration_close),
        status: row.status,
        is_visible: asBool(row.is_visible),
    };
}
const TERM_SELECT = `
  SELECT
    id,
    term_label,
    year,
    term_name,
    quarter_index,
    sequence_no,
    start_date,
    end_date,
    registration_open,
    registration_close,
    status,
    is_visible
  FROM academic_terms
`;
export async function listAcademicTerms() {
    const sql = `${TERM_SELECT} ORDER BY sequence_no DESC`;
    const [rows] = await pool.query(sql);
    return rows.map((r) => normalizeRow(r));
}
export async function listVisibleAcademicTerms(limit) {
    const lim = typeof limit === "number" &&
        Number.isInteger(limit) &&
        limit > 0
        ? limit
        : undefined;
    const sql = lim
        ? `${TERM_SELECT} WHERE is_visible = 1 ORDER BY sequence_no DESC LIMIT ?`
        : `${TERM_SELECT} WHERE is_visible = 1 ORDER BY sequence_no DESC`;
    const [rows] = await pool.query(sql, lim ? [lim] : []);
    return rows.map((r) => normalizeRow(r));
}
export async function listRecentVisibleAcademicTerms(limit = 3) {
    return listVisibleAcademicTerms(limit);
}
export async function getAcademicTermById(id) {
    const sql = `${TERM_SELECT} WHERE id = ? LIMIT 1`;
    const [rows] = await pool.query(sql, [id]);
    const row = rows[0];
    return row ? normalizeRow(row) : null;
}
export async function getCurrentRegistrationOpenTerm() {
    const sql = `${TERM_SELECT} WHERE status = 'registration_open' ORDER BY sequence_no DESC LIMIT 1`;
    const [rows] = await pool.query(sql);
    const row = rows[0];
    return row ? normalizeRow(row) : null;
}
export async function insertAcademicTerm(row) {
    const sql = `
    INSERT INTO academic_terms (
      id,
      term_label,
      year,
      term_name,
      quarter_index,
      sequence_no,
      start_date,
      end_date,
      registration_open,
      registration_close,
      status,
      is_visible
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const params = [
        row.id,
        row.term_label,
        row.year,
        row.term_name,
        row.quarter_index,
        row.sequence_no,
        row.start_date,
        row.end_date,
        row.registration_open,
        row.registration_close,
        row.status,
        row.is_visible ? 1 : 0,
    ];
    await pool.query(sql, params);
    const created = await getAcademicTermById(row.id);
    if (!created) {
        throw new Error("Failed to load academic term after insert");
    }
    return created;
}
/**
 * Full row replace by current primary key `currentId` (supports changing `id` when year/term_name change).
 */
export async function updateAcademicTermRow(currentId, row) {
    const existing = await getAcademicTermById(currentId);
    if (!existing)
        return null;
    const sql = `
    UPDATE academic_terms SET
      id = ?,
      term_label = ?,
      year = ?,
      term_name = ?,
      quarter_index = ?,
      sequence_no = ?,
      start_date = ?,
      end_date = ?,
      registration_open = ?,
      registration_close = ?,
      status = ?,
      is_visible = ?
    WHERE id = ?
  `;
    const params = [
        row.id,
        row.term_label,
        row.year,
        row.term_name,
        row.quarter_index,
        row.sequence_no,
        row.start_date,
        row.end_date,
        row.registration_open,
        row.registration_close,
        row.status,
        row.is_visible ? 1 : 0,
        currentId,
    ];
    await pool.query(sql, params);
    return getAcademicTermById(row.id);
}
//# sourceMappingURL=academicTermRepository.js.map