const TRACK_LABELS = {
    C: "Chinese",
    E: "English",
};
const INTAKE_LABELS = {
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
function trimToNull(value) {
    if (value == null)
        return null;
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
}
export function getAdminStudentTrackLabel(trackCode) {
    if (trackCode == null)
        return null;
    if (trackCode === "C" || trackCode === "E") {
        return TRACK_LABELS[trackCode];
    }
    return null;
}
export function getAdminStudentIntakeLabel(intakeCode) {
    if (intakeCode == null)
        return null;
    return INTAKE_LABELS[intakeCode] ?? `Intake ${intakeCode}`;
}
export function parseAdminStudentEnrollmentInfo(studentIdRaw) {
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
    const trackCandidate = normalizedId.length >= 4 ? normalizedId.charAt(0) : "";
    const trackCode = trackCandidate === "C" || trackCandidate === "E" ? trackCandidate : null;
    const trackLabel = getAdminStudentTrackLabel(trackCode);
    let entryYear = null;
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
//# sourceMappingURL=adminStudentEnrollmentMetadata.js.map