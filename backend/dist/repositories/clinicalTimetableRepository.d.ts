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
};
/**
 * Optional filters: when `year` or `term` is null/undefined, that filter is skipped.
 */
export declare function listClinicTimetableSlots(options?: {
    year?: number | null;
    term?: string | null;
}): Promise<ClinicTimetableDbRow[]>;
export declare function getClinicTimetableById(seqNum: number): Promise<ClinicTimetableDbRow | null>;
//# sourceMappingURL=clinicalTimetableRepository.d.ts.map