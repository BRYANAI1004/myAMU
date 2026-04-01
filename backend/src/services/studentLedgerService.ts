import { DEMO_STUDENT_ID } from "../config/constants.js";
import { pool } from "../lib/db.js";
import {
  listLegacyAccountingQuarters,
  loadLegacyAccountingRows,
} from "../repositories/studentLegacyAccountRepository.js";

export type LedgerQuarterOption = {
  term: string;
  year: number;
  label: string;
};

export type LedgerRowDto = {
  date: string;
  type: string;
  code: string;
  memo: string;
  debit: number;
  credit: number;
};

export type LedgerSummaryDto = {
  totalCharges: number;
  totalPayments: number;
  balance: number;
};

function formatQuarterLabel(term: string, year: number): string {
  const t = term.trim();
  if (t.length === 0) {
    return String(year);
  }
  const head = t.slice(0, 1).toUpperCase();
  const tail = t.slice(1).toLowerCase();
  return `${head}${tail} ${year}`;
}

/** Legacy `accounting.date` is YYYYMMDD int → `YYYY-MM-DD` for clients. */
function legacyAccountingDateToIso(date: number): string {
  const n = Math.trunc(Number(date));
  if (!Number.isFinite(n) || n <= 0) {
    return "";
  }
  const s = String(Math.abs(n)).padStart(8, "0").slice(-8);
  const y = s.slice(0, 4);
  const mo = s.slice(4, 6);
  const d = s.slice(6, 8);
  return `${y}-${mo}-${d}`;
}

export async function getAccountingQuartersPayload(studentId: string): Promise<{
  studentId: string;
  quarters: LedgerQuarterOption[];
}> {
  if (studentId === DEMO_STUDENT_ID) {
    return { studentId, quarters: [] };
  }

  const rows = await listLegacyAccountingQuarters(pool, studentId);
  const quarters = rows.map((r) => ({
    term: r.term,
    year: r.year,
    label: formatQuarterLabel(r.term, r.year),
  }));

  return { studentId, quarters };
}

export async function getAccountingLedgerPayload(
  studentId: string,
  term: string,
  year: number,
): Promise<{
  studentId: string;
  term: string;
  year: number;
  rows: LedgerRowDto[];
  summary: LedgerSummaryDto;
} | null> {
  const termTrim = term.trim();
  if (termTrim === "" || !Number.isFinite(year)) {
    return null;
  }

  if (studentId === DEMO_STUDENT_ID) {
    return {
      studentId,
      term: termTrim,
      year,
      rows: [],
      summary: { totalCharges: 0, totalPayments: 0, balance: 0 },
    };
  }

  const legacy = await loadLegacyAccountingRows(
    pool,
    studentId,
    termTrim,
    year,
  );

  let totalCharges = 0;
  let totalPayments = 0;
  const rows: LedgerRowDto[] = legacy.map((r) => {
    totalCharges += r.debit;
    totalPayments += r.credit;
    return {
      date: legacyAccountingDateToIso(r.date),
      type: r.type,
      code: r.code,
      memo: r.memo,
      debit: r.debit,
      credit: r.credit,
    };
  });

  const resolvedTerm = legacy[0]?.term ?? termTrim;
  const resolvedYear = legacy[0]?.year ?? year;

  return {
    studentId,
    term: resolvedTerm,
    year: resolvedYear,
    rows,
    summary: {
      totalCharges,
      totalPayments,
      balance: totalCharges - totalPayments,
    },
  };
}
