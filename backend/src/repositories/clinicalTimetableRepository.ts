import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../lib/db.js";

/** Row shape from legacy `clinic_timetable` (see school.sql). */
export type ClinicTimetableDbRow = {
  id: number;
  year: number;
  term: string;
  weekday: string;
  time_from: string;
  time_to: string;
  slot: string;
  instructor_id: string;
  instructor: string;
  /** Legacy per-level caps (`100Max` … `123Max`); summed for portal capacity when present. */
  cap_100: number;
  cap_200: number;
  cap_300: number;
  cap_123: number;
};

function mapTimetableRow(r: RowDataPacket): ClinicTimetableDbRow {
  const row = r as Record<string, unknown>;
  const tf = row.time_from;
  const tt = row.time_to;
  const asTime = (v: unknown): string => {
    if (v instanceof Date) {
      const h = v.getUTCHours();
      const m = v.getUTCMinutes();
      const s = v.getUTCSeconds();
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return String(v ?? "").trim();
  };
  const asInt = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
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
    cap_100: asInt(row.cap_100),
    cap_200: asInt(row.cap_200),
    cap_300: asInt(row.cap_300),
    cap_123: asInt(row.cap_123),
  };
}

/**
 * Optional filters: when `year` or `term` is null/undefined, that filter is skipped.
 */
export async function listClinicTimetableSlots(options?: {
  year?: number | null;
  term?: string | null;
}): Promise<ClinicTimetableDbRow[]> {
  const y = options?.year;
  const t = options?.term != null ? String(options.term).trim() : "";
  const yearClause =
    y != null && Number.isFinite(y) ? " AND year = ? " : "";
  const termClause = t !== "" ? " AND TRIM(term) = TRIM(?) " : "";
  const params: (string | number)[] = [];
  if (y != null && Number.isFinite(y)) {
    params.push(Number(y));
  }
  if (t !== "") {
    params.push(t);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT seqNum AS id, year, term, day AS weekday,
            time_from, time_to, slot, instructor_id, instructor,
            \`100Max\` AS cap_100, \`200Max\` AS cap_200,
            \`300Max\` AS cap_300, \`123Max\` AS cap_123
       FROM clinic_timetable
      WHERE 1=1
      ${yearClause}
      ${termClause}
      ORDER BY year DESC, term ASC, weekday ASC, time_from ASC, seqNum ASC`,
    params,
  );
  return rows.map(mapTimetableRow);
}

export async function getClinicTimetableById(
  seqNum: number,
): Promise<ClinicTimetableDbRow | null> {
  if (!Number.isFinite(seqNum) || seqNum <= 0) {
    return null;
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT seqNum AS id, year, term, day AS weekday,
            time_from, time_to, slot, instructor_id, instructor,
            \`100Max\` AS cap_100, \`200Max\` AS cap_200,
            \`300Max\` AS cap_300, \`123Max\` AS cap_123
       FROM clinic_timetable
      WHERE seqNum = ?
      LIMIT 1`,
    [seqNum],
  );
  if (rows.length === 0) {
    return null;
  }
  return mapTimetableRow(rows[0]!);
}

export type ClinicTimetableAdminRow = ClinicTimetableDbRow & {
  /** `academic_terms.id` when year + legacy term matches a portal term; otherwise null. */
  academic_term_id: string | null;
};

function mapTimetableAdminRow(r: RowDataPacket): ClinicTimetableAdminRow {
  const base = mapTimetableRow(r);
  const row = r as Record<string, unknown>;
  const aid = row.academic_term_id;
  return {
    ...base,
    academic_term_id:
      aid == null || aid === "" ? null : String(aid).trim() || null,
  };
}

/**
 * Admin list: same filters as `listClinicTimetableSlots`, plus optional `academic_terms.id` via join.
 */
export async function listClinicTimetableSlotsForAdmin(options?: {
  year?: number | null;
  term?: string | null;
}): Promise<ClinicTimetableAdminRow[]> {
  const y = options?.year;
  const t = options?.term != null ? String(options.term).trim() : "";
  const yearClause =
    y != null && Number.isFinite(y) ? " AND ct.year = ? " : "";
  const termClause = t !== "" ? " AND TRIM(ct.term) = TRIM(?) " : "";
  const params: (string | number)[] = [];
  if (y != null && Number.isFinite(y)) {
    params.push(Number(y));
  }
  if (t !== "") {
    params.push(t);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ct.seqNum AS id, ct.year, ct.term, ct.day AS weekday,
            ct.time_from, ct.time_to, ct.slot, ct.instructor_id, ct.instructor,
            ct.\`100Max\` AS cap_100, ct.\`200Max\` AS cap_200,
            ct.\`300Max\` AS cap_300, ct.\`123Max\` AS cap_123,
            at.id AS academic_term_id
       FROM clinic_timetable ct
       LEFT JOIN academic_terms at
         ON at.year = ct.year AND at.term_name = TRIM(ct.term)
      WHERE 1=1
      ${yearClause}
      ${termClause}
      ORDER BY ct.year DESC, TRIM(ct.term) ASC, ct.day ASC, ct.time_from ASC, ct.seqNum ASC`,
    params,
  );
  return rows.map(mapTimetableAdminRow);
}

export type ClinicTimetableWritePayload = {
  year: number;
  term: string;
  day: string;
  time_from: string;
  time_to: string;
  slot: string;
  instructor_id: string;
  instructor: string;
  cap_100: number;
  cap_200: number;
  cap_300: number;
  cap_123: number;
};

export async function createClinicTimetableSlot(
  payload: ClinicTimetableWritePayload,
): Promise<number> {
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO clinic_timetable (
        year, term, day, time_from, time_to, slot,
        instructor_id, instructor,
        \`100Max\`, \`200Max\`, \`300Max\`, \`123Max\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.year,
      payload.term,
      payload.day,
      payload.time_from,
      payload.time_to,
      payload.slot,
      payload.instructor_id,
      payload.instructor,
      payload.cap_100,
      payload.cap_200,
      payload.cap_300,
      payload.cap_123,
    ],
  );
  return Number(res.insertId);
}

export async function updateClinicTimetableSlot(
  seqNum: number,
  payload: ClinicTimetableWritePayload,
): Promise<boolean> {
  if (!Number.isFinite(seqNum) || seqNum <= 0) {
    return false;
  }
  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE clinic_timetable SET
        year = ?, term = ?, day = ?, time_from = ?, time_to = ?, slot = ?,
        instructor_id = ?, instructor = ?,
        \`100Max\` = ?, \`200Max\` = ?, \`300Max\` = ?, \`123Max\` = ?
      WHERE seqNum = ?`,
    [
      payload.year,
      payload.term,
      payload.day,
      payload.time_from,
      payload.time_to,
      payload.slot,
      payload.instructor_id,
      payload.instructor,
      payload.cap_100,
      payload.cap_200,
      payload.cap_300,
      payload.cap_123,
      seqNum,
    ],
  );
  return res.affectedRows > 0;
}

export async function deleteClinicTimetableSlot(seqNum: number): Promise<boolean> {
  if (!Number.isFinite(seqNum) || seqNum <= 0) {
    return false;
  }
  const [res] = await pool.query<ResultSetHeader>(
    `DELETE FROM clinic_timetable WHERE seqNum = ?`,
    [seqNum],
  );
  return res.affectedRows > 0;
}

export type ClinicTimetableReferenceCounts = {
  enrollments: number;
  requests: number;
  assignments: number;
};

/**
 * Rows still pointing at this `clinic_timetable.seqNum` (enrollments, requests, assignments).
 */
export async function countClinicTimetableReferences(
  seqNum: number,
): Promise<ClinicTimetableReferenceCounts> {
  if (!Number.isFinite(seqNum) || seqNum <= 0) {
    return { enrollments: 0, requests: 0, assignments: 0 };
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        (SELECT COUNT(*) FROM clinical_enrollments WHERE timetable_id = ?) AS enrollments,
        (SELECT COUNT(*) FROM clinical_requests WHERE timetable_id = ?) AS requests,
        (SELECT COUNT(*) FROM clinical_assignments WHERE timetable_id = ?) AS assignments`,
    [seqNum, seqNum, seqNum],
  );
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) {
    return { enrollments: 0, requests: 0, assignments: 0 };
  }
  return {
    enrollments: Math.max(0, Math.trunc(Number(r.enrollments))),
    requests: Math.max(0, Math.trunc(Number(r.requests))),
    assignments: Math.max(0, Math.trunc(Number(r.assignments))),
  };
}
