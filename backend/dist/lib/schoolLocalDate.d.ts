/**
 * Returns current school-local calendar date as `YYYY-MM-DD`.
 * Business rules that use school dates must compare against this value.
 */
export declare function schoolLocalTodayIsoDate(now?: Date): string;
/** True only after the end of due-day in America/Los_Angeles. */
export declare function isPastSchoolLocalDueDate(dueDateIso: string): boolean;
//# sourceMappingURL=schoolLocalDate.d.ts.map