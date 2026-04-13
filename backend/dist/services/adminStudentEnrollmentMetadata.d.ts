export type AdminStudentTrackCode = "C" | "E";
export type AdminStudentEnrollmentInfo = {
    trackCode: AdminStudentTrackCode | null;
    trackLabel: "Chinese" | "English" | null;
    entryYear: number | null;
    intakeCode: string | null;
    intakeLabel: string | null;
};
export declare function getAdminStudentTrackLabel(trackCode: string | null): "Chinese" | "English" | null;
export declare function getAdminStudentIntakeLabel(intakeCode: string | null): string | null;
export declare function parseAdminStudentEnrollmentInfo(studentIdRaw: unknown): AdminStudentEnrollmentInfo;
//# sourceMappingURL=adminStudentEnrollmentMetadata.d.ts.map