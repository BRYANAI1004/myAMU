const SCHOOL_TIME_ZONE = "America/Los_Angeles";
/**
 * Returns current school-local calendar date as `YYYY-MM-DD`.
 * Business rules that use school dates must compare against this value.
 */
export function schoolLocalTodayIsoDate(now = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: SCHOOL_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
        throw new Error("Failed to format school-local date.");
    }
    return `${year}-${month}-${day}`;
}
/** True only after the end of due-day in America/Los_Angeles. */
export function isPastSchoolLocalDueDate(dueDateIso) {
    const due = dueDateIso.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        return false;
    }
    return schoolLocalTodayIsoDate() > due;
}
//# sourceMappingURL=schoolLocalDate.js.map