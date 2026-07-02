import type { AcademicTermDetail } from "../types/academicTerm.js";
import { schoolLocalTodayIsoDate } from "./schoolLocalDate.js";

export type RegistrationWindowStatus = "open" | "not_yet_open" | "closed";

export class RegistrationWindowClosedError extends Error {
  readonly status: "not_yet_open" | "closed";
  readonly registrationOpen: string | null;
  readonly registrationClose: string | null;

  constructor(
    status: "not_yet_open" | "closed",
    registrationOpen: string | null,
    registrationClose: string | null,
  ) {
    super(
      status === "not_yet_open"
        ? "Registration for this term has not opened yet."
        : "Registration for this term has closed.",
    );
    this.name = "RegistrationWindowClosedError";
    this.status = status;
    this.registrationOpen = registrationOpen;
    this.registrationClose = registrationClose;
  }
}

function normalizeIsoDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const d = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export function getRegistrationWindowStatus(
  term:
    | Pick<AcademicTermDetail, "registration_open" | "registration_close">
    | null
    | undefined,
  now: Date = new Date(),
): RegistrationWindowStatus {
  if (term == null) return "open";

  const open = normalizeIsoDate(term.registration_open);
  const close = normalizeIsoDate(term.registration_close);
  const today = schoolLocalTodayIsoDate(now);

  if (open != null && today < open) return "not_yet_open";
  if (close != null && today > close) return "closed";
  return "open";
}

export function assertRegistrationWindowOpen(
  term:
    | Pick<AcademicTermDetail, "registration_open" | "registration_close">
    | null
    | undefined,
  now?: Date,
): void {
  const status = getRegistrationWindowStatus(term, now);
  if (status === "open") return;
  throw new RegistrationWindowClosedError(
    status,
    normalizeIsoDate(term?.registration_open ?? null),
    normalizeIsoDate(term?.registration_close ?? null),
  );
}
