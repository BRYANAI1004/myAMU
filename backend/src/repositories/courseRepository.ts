import { pool, type RowDataPacket } from "../lib/db.js";
import { ensurePortalCoursesForLegacyCatalog } from "./portalCourseRepository.js";

/** API output keys (fixed contract). */
export const COURSE_LIST_KEYS = [
  "course_id",
  "sequence_number",
  "code",
  "eng_name",
  "chi_name",
  "units",
  "prerequisite",
  "concurrent",
  "category",
  "is_daim",
  "clinic1Required",
  "clinic2Required",
] as const;

export type CourseListKey = (typeof COURSE_LIST_KEYS)[number];

export type CourseListItem = Record<CourseListKey, string | number | boolean | null>;

type ColumnSpec = { out: CourseListKey; candidates: readonly string[] };

const COLUMN_SPECS: ColumnSpec[] = [
  {
    out: "sequence_number",
    candidates: ["sequenceNumber", "sequence_number", "seq", "id"],
  },
  { out: "code", candidates: ["code"] },
  { out: "eng_name", candidates: ["eng_name", "engName"] },
  { out: "chi_name", candidates: ["chi_name", "chiName"] },
  { out: "units", candidates: ["units"] },
  {
    out: "prerequisite",
    candidates: ["prerequisite", "prereq", "prerequisites"],
  },
  { out: "concurrent", candidates: ["concurrent"] },
  { out: "category", candidates: ["category"] },
  { out: "is_daim", candidates: ["is_daim", "isDaim"] },
  {
    out: "clinic1Required",
    candidates: [
      "clinic1Required",
      "clinicL1Required",
      "clinic1_required",
      "clinic_1_required",
      "clinic1_req",
    ],
  },
  {
    out: "clinic2Required",
    candidates: [
      "clinic2Required",
      "clinicL2Required",
      "clinic2_required",
      "clinic_2_required",
      "clinic2_req",
    ],
  },
];

const ORDER_BY_CANDIDATES = ["code"] as const;

let columnsCache: Set<string> | null = null;
/** Avoid parallel catalog reads each bootstrapping portal_courses (summary + list fire together). */
let portalCoursesBootstrapPromise: ReturnType<
  typeof ensurePortalCoursesForLegacyCatalog
> | null = null;

function invalidateCoursesColumnCache(): void {
  columnsCache = null;
}

async function ensurePortalCoursesBootstrappedOnce(): Promise<void> {
  if (!portalCoursesBootstrapPromise) {
    portalCoursesBootstrapPromise = ensurePortalCoursesForLegacyCatalog().catch(
      (e) => {
        portalCoursesBootstrapPromise = null;
        throw e;
      },
    );
  }
  await portalCoursesBootstrapPromise;
}

async function loadCoursesTableColumns(): Promise<Set<string>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'courses'
     ORDER BY ordinal_position`,
  );
  return new Set(
    rows.map((r) => {
      const raw = r.column_name ?? r.columnName ?? r.columnname;
      return String(raw ?? "").trim();
    }).filter((name) => name !== ""),
  );
}

function pickColumn(
  cols: Set<string>,
  candidates: readonly string[],
): string | undefined {
  for (const c of candidates) {
    if (cols.has(c)) return c;
  }
  return undefined;
}

function quoteIdent(name: string): string {
  return `\`${name.replace(/`/g, "")}\``;
}

function normalizeRow(row: RowDataPacket): CourseListItem {
  const out = {} as CourseListItem;
  for (const key of COURSE_LIST_KEYS) {
    const v = row[key];
    out[key] =
      v === undefined || v === null
        ? null
        : typeof v === "bigint"
          ? Number(v)
          : (v as string | number | boolean);
  }
  return out;
}

type CoursesSelectParts = {
  selections: string[];
  joinClause: string;
  orderClause: string;
  whereClause: string;
  whereParams: string[];
};

async function buildCoursesSelectParts(
  options?: { q?: string; prefixes?: string[] },
): Promise<CoursesSelectParts | null> {
  let cols = columnsCache;
  if (!cols) {
    try {
      cols = await loadCoursesTableColumns();
      columnsCache = cols;
    } catch (e) {
      invalidateCoursesColumnCache();
      throw e;
    }
  }

  const selections: string[] = [];
  const codePhysical = pickColumn(cols, ["code"]);

  if (codePhysical) {
    await ensurePortalCoursesBootstrappedOnce();
  }

  for (const spec of COLUMN_SPECS) {
    const physical = pickColumn(cols, spec.candidates);
    if (!physical) continue;
    selections.push(
      `${quoteIdent(physical)} AS ${quoteIdent(spec.out)}`,
    );
  }

  if (codePhysical) {
    selections.unshift("pc.course_id AS `course_id`");
  }

  if (selections.length === 0) {
    return null;
  }

  const orderCol = pickColumn(cols, ORDER_BY_CANDIDATES);
  const orderClause = orderCol
    ? `ORDER BY c.${quoteIdent(orderCol)} ASC`
    : "";
  const joinClause = codePhysical
    ? `LEFT JOIN (
         SELECT
           course_code,
           MIN(course_id) AS course_id
         FROM portal_courses
         GROUP BY course_code
       ) pc
         ON TRIM(pc.course_code) =
            TRIM(c.${quoteIdent(codePhysical)})`
    : "";

  const term = options?.q?.trim().toLowerCase() ?? "";
  const prefixFilters = (options?.prefixes ?? [])
    .map((p) => p.trim().toUpperCase())
    .filter((p) => p.length >= 2);
  const whereParts: string[] = [];
  const whereParams: string[] = [];
  if (term !== "") {
    const like = `%${term}%`;
    const engPhysical = pickColumn(cols, ["eng_name", "engName"]);
    const chiPhysical = pickColumn(cols, ["chi_name", "chiName"]);
    const searchParts: string[] = [];
    if (codePhysical) {
      searchParts.push(`LOWER(TRIM(c.${quoteIdent(codePhysical)})) LIKE ?`);
      whereParams.push(like);
    }
    if (engPhysical) {
      searchParts.push(`LOWER(TRIM(c.${quoteIdent(engPhysical)})) LIKE ?`);
      whereParams.push(like);
    }
    if (chiPhysical) {
      searchParts.push(`LOWER(TRIM(c.${quoteIdent(chiPhysical)})) LIKE ?`);
      whereParams.push(like);
    }
    if (searchParts.length > 0) {
      whereParts.push(`(${searchParts.join(" OR ")})`);
    }
  }

  if (prefixFilters.length > 0 && codePhysical) {
    const prefixParts = prefixFilters.map(
      () => `UPPER(TRIM(c.${quoteIdent(codePhysical)})) LIKE ?`,
    );
    whereParts.push(`(${prefixParts.join(" OR ")})`);
    for (const p of prefixFilters) {
      whereParams.push(`${p}%`);
    }
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  return {
    selections,
    joinClause,
    orderClause,
    whereClause,
    whereParams,
  };
}

export type CourseCatalogPageResult = {
  rows: CourseListItem[];
  total: number;
  page: number;
  limit: number;
};

export async function searchCoursesPage(params: {
  q?: string;
  prefixes?: string[];
  page?: number;
  limit?: number;
}): Promise<CourseCatalogPageResult> {
  const limit = Math.min(Math.max(Math.trunc(params.limit ?? 25), 1), 100);
  const page = Math.max(Math.trunc(params.page ?? 1), 1);
  const offset = (page - 1) * limit;

  const parts = await buildCoursesSelectParts({
    q: params.q,
    prefixes: params.prefixes,
  });
  if (parts == null) {
    return { rows: [], total: 0, page, limit };
  }

  const { selections, joinClause, orderClause, whereClause, whereParams } =
    parts;

  const countSql =
    `SELECT COUNT(*) AS cnt FROM ${quoteIdent("courses")} c ${joinClause} ${whereClause}`.trim();
  const dataSql =
    `SELECT ${selections.join(", ")} FROM ${quoteIdent("courses")} c ${joinClause} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`.trim();

  try {
    const [countRows] = await pool.query<RowDataPacket[]>(
      countSql,
      whereParams,
    );
    const totalRaw = countRows[0]?.cnt ?? countRows[0]?.CNT ?? 0;
    const total =
      typeof totalRaw === "bigint"
        ? Number(totalRaw)
        : Number(totalRaw) || 0;

    const [rows] = await pool.query<RowDataPacket[]>(dataSql, [
      ...whereParams,
      limit,
      offset,
    ]);

    return {
      rows: rows.map((row) => normalizeRow(row)),
      total,
      page,
      limit,
    };
  } catch (e) {
    invalidateCoursesColumnCache();
    throw e;
  }
}

/**
 * Lists rows from `school.courses` (current DB from env). Column names are
 * resolved against INFORMATION_SCHEMA so minor naming differences are handled.
 */
export async function listCoursesFromMysql(): Promise<CourseListItem[]> {
  const parts = await buildCoursesSelectParts();
  if (parts == null) {
    return [];
  }

  const { selections, joinClause, orderClause } = parts;
  const sql =
    `SELECT ${selections.join(", ")} FROM ${quoteIdent("courses")} c ${joinClause} ${orderClause}`.trim();

  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql);
    return rows.map((row) => normalizeRow(row));
  } catch (e) {
    invalidateCoursesColumnCache();
    throw e;
  }
}

export type CourseCatalogPrefixCounts = {
  total: number;
  byPrefix: Record<string, number>;
};

/** Count catalog rows grouped by the first two characters of `code`. */
export async function countCoursesByCodePrefix(): Promise<CourseCatalogPrefixCounts> {
  const parts = await buildCoursesSelectParts();
  if (parts == null) {
    return { total: 0, byPrefix: {} };
  }

  let cols = columnsCache;
  if (!cols) {
    cols = await loadCoursesTableColumns();
    columnsCache = cols;
  }
  const codePhysical = pickColumn(cols, ["code"]);
  if (!codePhysical) {
    return { total: 0, byPrefix: {} };
  }

  const { joinClause, whereClause, whereParams } = parts;
  const countSql =
    `SELECT COUNT(*) AS cnt FROM ${quoteIdent("courses")} c ${joinClause} ${whereClause}`.trim();
  const groupSql =
    `SELECT UPPER(LEFT(TRIM(c.${quoteIdent(codePhysical)}), 2)) AS prefix, COUNT(*) AS cnt
     FROM ${quoteIdent("courses")} c ${joinClause} ${whereClause}
     GROUP BY prefix
     ORDER BY prefix`.trim();

  try {
    const [totalRows] = await pool.query<RowDataPacket[]>(countSql, whereParams);
    const totalRaw = totalRows[0]?.cnt ?? totalRows[0]?.CNT ?? 0;
    const total =
      typeof totalRaw === "bigint"
        ? Number(totalRaw)
        : Number(totalRaw) || 0;

    const [groupRows] = await pool.query<RowDataPacket[]>(groupSql, whereParams);
    const byPrefix: Record<string, number> = {};
    for (const row of groupRows) {
      const p = String(row.prefix ?? "").trim().toUpperCase();
      if (p === "") continue;
      const c = row.cnt ?? row.CNT ?? 0;
      byPrefix[p] =
        typeof c === "bigint" ? Number(c) : Number(c) || 0;
    }
    return { total, byPrefix };
  } catch (e) {
    invalidateCoursesColumnCache();
    throw e;
  }
}
