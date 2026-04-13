export type AdminStudentTrackCode = "C" | "E";

export type AdminStudentEnrollmentInfo = {
  trackCode: AdminStudentTrackCode | null;
  trackLabel: "Chinese" | "English" | null;
  entryYear: number | null;
  intakeCode: string | null;
  intakeLabel: string | null;
};

const TRACK_LABELS: Record<AdminStudentTrackCode, "Chinese" | "English"> = {
  C: "Chinese",
  E: "English",
};

const INTAKE_LABELS: Record<string, string> = {
  "1": "January",
  "2": "February",
  "3": "March",
  "4": "April",
  "5": "May",
  "6": "June",
  "7": "July",
  "8": "August",
  "9": "September",
};

function trimToNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

export function getAdminStudentTrackLabel(
  trackCode: string | null,
): "Chinese" | "English" | null {
  if (trackCode == null) return null;
  if (trackCode === "C" || trackCode === "E") {
    return TRACK_LABELS[trackCode];
  }
  return null;
}

export function getAdminStudentIntakeLabel(intakeCode: string | null): string | null {
  if (intakeCode == null) return null;
  return INTAKE_LABELS[intakeCode] ?? `Intake ${intakeCode}`;
}

export function parseAdminStudentEnrollmentInfo(
  studentIdRaw: unknown,
): AdminStudentEnrollmentInfo {
  const studentId = trimToNull(studentIdRaw);
  if (studentId == null) {
    return {
      trackCode: null,
      trackLabel: null,
      entryYear: null,
      intakeCode: null,
      intakeLabel: null,
    };
  }

  const normalizedId = studentId.toUpperCase();
  const trackCandidate = normalizedId.length >= 1 ? normalizedId.charAt(0) : "";
  const trackCode =
    trackCandidate === "C" || trackCandidate === "E" ? trackCandidate : null;
  const trackLabel = getAdminStudentTrackLabel(trackCode);

  let entryYear: number | null = null;
  if (normalizedId.length >= 4) {
    const yy = normalizedId.slice(1, 3);
    if (/^\d{2}$/.test(yy)) {
      entryYear = Number.parseInt(`20${yy}`, 10);
    }
  }

  const intakeCode = normalizedId.length >= 4 ? normalizedId.charAt(3) : null;

  return {
    trackCode,
    trackLabel,
    entryYear,
    intakeCode,
    intakeLabel: getAdminStudentIntakeLabel(intakeCode),
  };
}
