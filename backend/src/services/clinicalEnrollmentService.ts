import { insertPortalBillingAdjustment } from "../repositories/adminFinanceRepository.js";
import {
  clinicalBookingPaymentHoldsTableExists,
  insertClinicalBookingPaymentHoldInConn,
  cancelActiveClinicalBookingPaymentHoldsForEnrollment,
  voidSystemClinicalChargesForEnrollmentInConn,
} from "../repositories/clinicalBookingPaymentHoldRepository.js";
import {
  getClinicTimetableById,
  type ClinicTimetableDbRow,
} from "../repositories/clinicalTimetableRepository.js";
import {
  createClinicalEnrollment,
  dropClinicalEnrollment,
  getClinicalEnrollmentSlotBinding,
  listActiveClinicalRosterForTimetable,
  listAvailableClinicalEnrollmentSlots,
  listStudentClinicalEnrollments,
  type ClinicalEnrollmentSlotRow,
  type ClinicalEnrollmentStudentRow,
  type ClinicalSeatBucket,
  type ClinicalSlotRosterAdminRow,
  studentExistsByExternalId,
} from "../repositories/clinicalEnrollmentRepository.js";
import { insertClinicalAssignment } from "../repositories/clinicalScheduleRepository.js";
import {
  buildClinicTimetableSlotLabel,
  buildTimetableClinicalAssignmentPayload,
  ClinicalScheduleValidationError,
  formatClinicTimeHm,
} from "./clinicalScheduleService.js";
import { getStudentQuarterBalance } from "./studentLedgerService.js";
import {
  reconcileExpiredClinicalBookingHoldsForTimetable,
  reconcilePaidClinicalBookingPaymentHoldsForStudent,
  revokeExpiredClinicalBooking,
  runDueClinicalBookingHoldCleanupBatches,
} from "./clinicalBookingPaymentHoldService.js";
import { getAdminClinicalEnrollmentGradeSnapshot } from "./adminMarksService.js";

/**
 * Phase 2: flat fee for a new clinical timetable slot booking until per-slot pricing exists.
 * Single source for this placeholder amount (replace when `clinic_timetable` carries price).
 */
const CLINICAL_SLOT_BOOKING_CHARGE_USD = 150;

function roundClinicalBookingMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function clinicalSlotBookingLedgerDescription(tt: ClinicTimetableDbRow): string {
  const slotLabel = buildClinicTimetableSlotLabel({
    weekday: tt.weekday,
    timeFrom: formatClinicTimeHm(tt.time_from),
    timeTo: formatClinicTimeHm(tt.time_to),
    slot: tt.slot,
    instructor: tt.instructor?.trim() ? tt.instructor.trim() : null,
  });
  const term = tt.term.trim();
  const y = tt.year;
  const raw = `Clinical booking — ${term} ${y} · ${slotLabel}`;
  return raw.length <= 255 ? raw : raw.slice(0, 252) + "...";
}

export type OpenClinicalSlotForStudentDto = ClinicalEnrollmentSlotRow & {
  alreadyEnrolled: boolean;
};

export type AdminClinicalSlotRosterDto = ClinicalSlotRosterAdminRow & {
  clinicalCode: string | null;
  clinicalBaseCode: string | null;
  clinicalGrade: string;
  clinicalGrade2: number | null;
};

function normalizeQueryTerm(term: string | null | undefined): string | null {
  if (term == null) return null;
  const t = String(term).trim();
  return t === "" ? null : t.slice(0, 20);
}

function normalizeQueryYear(
  year: string | number | null | undefined,
): number | null {
  if (year == null || year === "") return null;
  const n = typeof year === "number" ? year : Number(String(year).trim());
  return Number.isFinite(n) ? n : null;
}

export async function listOpenClinicalSlotsForStudent(
  studentId: string,
  query?: { term?: string | null; year?: string | number | null },
): Promise<OpenClinicalSlotForStudentDto[]> {
  const sid = String(studentId ?? "").trim();
  if (sid === "") {
    throw new ClinicalScheduleValidationError("Student id is required");
  }
  const term = normalizeQueryTerm(query?.term ?? null);
  const year = normalizeQueryYear(query?.year ?? null);

  await runDueClinicalBookingHoldCleanupBatches();
  await reconcilePaidClinicalBookingPaymentHoldsForStudent(sid);
  await revokeExpiredClinicalBooking(sid);

  const [slots, mine] = await Promise.all([
    listAvailableClinicalEnrollmentSlots({
      year,
      term,
    }),
    listStudentClinicalEnrollments(sid, {
      term,
      year,
    }),
  ]);

  const activeTimetableIds = new Set(
    mine
      .filter((r) => r.status.trim().toLowerCase() === "enrolled")
      .map((r) => r.timetableId),
  );

  return slots.map((s) => ({
    ...s,
    alreadyEnrolled: activeTimetableIds.has(s.timetableId),
  }));
}

/**
 * Enrolled clinical timetable rows after query-time revocation of unpaid expired registrations.
 * Single entry point for student schedule / roster-style reads.
 */
export async function getActiveClinicalBookings(
  studentId: string,
  query?: { term?: string | null; year?: string | number | null },
): Promise<ClinicalEnrollmentStudentRow[]> {
  const sid = String(studentId ?? "").trim();
  if (sid === "") {
    throw new ClinicalScheduleValidationError("Student id is required");
  }
  const term = normalizeQueryTerm(query?.term ?? null);
  const year = normalizeQueryYear(query?.year ?? null);
  await reconcilePaidClinicalBookingPaymentHoldsForStudent(sid);
  await revokeExpiredClinicalBooking(sid);
  await runDueClinicalBookingHoldCleanupBatches();
  const rows = await listStudentClinicalEnrollments(sid, { term, year });
  return rows.filter((r) => r.status.trim().toLowerCase() === "enrolled");
}

export async function listStudentClinicalEnrollmentRows(
  studentId: string,
  query?: { term?: string | null; year?: string | number | null },
): Promise<ClinicalEnrollmentStudentRow[]> {
  return getActiveClinicalBookings(studentId, query);
}

function totalTimetableCaps(tt: ClinicTimetableDbRow): number {
  return (
    Math.max(0, Math.trunc(tt.cap_100)) +
    Math.max(0, Math.trunc(tt.cap_200)) +
    Math.max(0, Math.trunc(tt.cap_300)) +
    Math.max(0, Math.trunc(tt.cap_123))
  );
}

function normalizeSeatBucketFromBody(
  raw: unknown,
): ClinicalSeatBucket | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const s = String(raw).trim().toLowerCase();
  if (s === "100" || s === "200" || s === "300") {
    return s;
  }
  if (s === "all" || s === "123") {
    return "all";
  }
  return "invalid";
}

export type ClinicalEnrollmentWithBillingResult =
  | {
      ok: true;
      enrollment: {
        enrollmentId: number;
        assignmentId: number;
        studentId: string;
        timetableId: number;
        term: string;
        year: number;
        seatBucket: ClinicalSeatBucket | null;
      };
      billingAdjustment: {
        id: number;
        amount: number;
        category: "clinical";
        adjustmentSource: "system_clinical";
      } | null;
      paymentHold: {
        created: boolean;
      } | null;
    }
  | { ok: false; error: string; status: number };

export async function enrollStudentInClinicalSlot(
  studentId: string,
  timetableId: number,
  seatBucketFromRequest: unknown,
): Promise<ClinicalEnrollmentWithBillingResult> {
  const sid = String(studentId ?? "").trim();
  if (sid === "") {
    return { ok: false, error: "Student id is required", status: 400 };
  }
  if (!Number.isFinite(timetableId) || timetableId <= 0) {
    return { ok: false, error: "timetableId is required", status: 400 };
  }

  await revokeExpiredClinicalBooking(sid);

  const tt = await getClinicTimetableById(timetableId);
  if (tt == null) {
    return { ok: false, error: "Clinic slot not found.", status: 400 };
  }

  await reconcileExpiredClinicalBookingHoldsForTimetable(timetableId);

  const term = tt.term.trim().slice(0, 20);
  const year = tt.year;
  if (term === "" || !Number.isFinite(year)) {
    return {
      ok: false,
      error: "This timetable row is missing a valid term or year.",
      status: 400,
    };
  }

  const bucketEnforced = totalTimetableCaps(tt) > 0;
  const normalized = normalizeSeatBucketFromBody(seatBucketFromRequest);
  if (normalized === "invalid") {
    return {
      ok: false,
      error: "seatBucket must be 100, 200, 300, or all.",
      status: 400,
    };
  }
  const resultMeta: {
    billingAdjustmentId?: number;
    billingAmount?: number;
    paymentHoldCreated?: boolean;
    term?: string;
    year?: number;
    assignmentId?: number;
    seatBucket?: ClinicalSeatBucket | null;
  } = {};

  const result = await createClinicalEnrollment(
    sid,
    timetableId,
    term,
    year,
    bucketEnforced ? normalized : null,
    async (conn) => {
      const payload = buildTimetableClinicalAssignmentPayload(sid, tt, null);
      return insertClinicalAssignment(payload, conn);
    },
    async ({
      conn,
      enrollmentId,
      isNewEnrollmentRow,
      wasReactivation,
      term,
      year,
      assignmentId,
      seatBucket,
    }) => {
      const shouldPostClinicalCharge = isNewEnrollmentRow || wasReactivation;
      if (!shouldPostClinicalCharge) return;

      if (wasReactivation) {
        await voidSystemClinicalChargesForEnrollmentInConn(
          conn,
          enrollmentId,
          "superseded",
        );
        if (await clinicalBookingPaymentHoldsTableExists()) {
          await cancelActiveClinicalBookingPaymentHoldsForEnrollment(
            conn,
            enrollmentId,
            "superseded",
          );
        }
      }
      const balanceBeforeCharge = await getStudentQuarterBalance(sid, term, year);
      const desc = clinicalSlotBookingLedgerDescription(tt);
      const amount = roundClinicalBookingMoney(CLINICAL_SLOT_BOOKING_CHARGE_USD);
      const adjustmentId = await insertPortalBillingAdjustment(conn, {
        studentExternalId: sid,
        term,
        year,
        description: desc,
        amount,
        category: "clinical",
        adjustmentSource: "system_clinical",
        clinicalEnrollmentId: enrollmentId,
      });
      let holdCreated = false;
      if (await clinicalBookingPaymentHoldsTableExists()) {
        await insertClinicalBookingPaymentHoldInConn(conn, {
          clinicalEnrollmentId: enrollmentId,
          studentId: sid,
          billingAdjustmentId: adjustmentId,
          term,
          year,
          chargeAmount: amount,
          balanceBeforeCharge,
        });
        holdCreated = true;
      }
      resultMeta.billingAdjustmentId = adjustmentId;
      resultMeta.billingAmount = amount;
      resultMeta.paymentHoldCreated = holdCreated;
      resultMeta.term = term;
      resultMeta.year = year;
      resultMeta.assignmentId = assignmentId;
      resultMeta.seatBucket = seatBucket;
    },
  );

  if (!result.ok) {
    return { ok: false, error: result.error, status: 400 };
  }

  return {
    ok: true,
    enrollment: {
      enrollmentId: result.enrollmentId,
      assignmentId: result.assignmentId,
      studentId: sid,
      timetableId,
      term: resultMeta.term ?? term,
      year: resultMeta.year ?? year,
      seatBucket: resultMeta.seatBucket ?? result.seatBucket,
    },
    billingAdjustment:
      resultMeta.billingAdjustmentId != null
        ? {
            id: resultMeta.billingAdjustmentId,
            amount:
              resultMeta.billingAmount ??
              roundClinicalBookingMoney(CLINICAL_SLOT_BOOKING_CHARGE_USD),
            category: "clinical",
            adjustmentSource: "system_clinical",
          }
        : null,
    paymentHold:
      resultMeta.billingAdjustmentId != null
        ? { created: resultMeta.paymentHoldCreated === true }
        : null,
  };
}

export async function adminAddStudentToClinicalSlot(
  timetableId: number,
  studentId: string,
  seatBucketFromRequest: unknown,
): Promise<ClinicalEnrollmentWithBillingResult> {
  const sid = String(studentId ?? "").trim().toUpperCase();
  if (sid === "") {
    return { ok: false, error: "Student id is required", status: 400 };
  }
  const exists = await studentExistsByExternalId(sid);
  if (!exists) {
    return { ok: false, error: "Student not found.", status: 404 };
  }
  return enrollStudentInClinicalSlot(sid, timetableId, seatBucketFromRequest);
}

export async function listAdminClinicalSlotRoster(
  timetableId: number,
): Promise<AdminClinicalSlotRosterDto[]> {
  if (!Number.isFinite(timetableId) || timetableId <= 0) {
    return [];
  }
  await runDueClinicalBookingHoldCleanupBatches();
  await reconcileExpiredClinicalBookingHoldsForTimetable(timetableId);
  const rows = await listActiveClinicalRosterForTimetable(timetableId);
  const snapshots = await Promise.all(
    rows.map((row) =>
      getAdminClinicalEnrollmentGradeSnapshot({
        timetableId,
        enrollmentId: row.enrollmentId,
        studentId: row.studentId,
      }),
    ),
  );
  return rows.map((row, idx) => {
    const snap = snapshots[idx];
    return {
      ...row,
      clinicalCode: snap?.clinicalCode ?? null,
      clinicalBaseCode: snap?.clinicalBaseCode ?? null,
      clinicalGrade: snap?.grade ?? "",
      clinicalGrade2: snap?.grade2 ?? null,
    };
  });
}

/**
 * Admin removes a student from a slot: same non-destructive drop as student self-serve.
 * Verifies the enrollment belongs to the given timetable row.
 */
export async function adminDropClinicalEnrollmentForSlot(
  timetableId: number,
  studentId: string,
  enrollmentId: number,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const tid = Number(timetableId);
  if (!Number.isFinite(tid) || tid <= 0) {
    return { ok: false, error: "Invalid timetable id", status: 400 };
  }
  const sid = String(studentId ?? "").trim();
  if (sid === "") {
    return { ok: false, error: "Student id is required", status: 400 };
  }
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
    return { ok: false, error: "Invalid enrollment id", status: 400 };
  }

  const binding = await getClinicalEnrollmentSlotBinding(enrollmentId, sid);
  if (binding == null || binding.timetableId !== tid) {
    return {
      ok: false,
      error: "Enrollment not found for this slot.",
      status: 404,
    };
  }
  if (binding.status !== "enrolled") {
    return {
      ok: false,
      error: "This enrollment is not active.",
      status: 400,
    };
  }

  return dropStudentClinicalEnrollment(sid, enrollmentId);
}

export async function dropStudentClinicalEnrollment(
  studentId: string,
  enrollmentId: number,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const sid = String(studentId ?? "").trim();
  if (sid === "") {
    return { ok: false, error: "Student id is required", status: 400 };
  }
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
    return { ok: false, error: "enrollmentId is required", status: 400 };
  }

  const result = await dropClinicalEnrollment(sid, enrollmentId);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      status: 400,
    };
  }
  return { ok: true };
}
