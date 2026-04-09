/** Exposed so the HTTP handler can log the same header list that was used to build the CSV. */
export declare const REGISTERED_STUDENTS_CSV_HEADERS: readonly string[];
export type BuildRegisteredStudentsCsvResult = {
    ok: true;
    filename: string;
    /** UTF-8 text without BOM (caller may prepend BOM for Excel). */
    csvBody: string;
    /** Populated in development only: unescaped cells for the first data row (same order as headers). */
    devDiagnostic?: {
        headerLabels: readonly string[];
        firstFlattenedRow: string[];
        csvFirstLine: string;
    };
} | {
    ok: false;
    kind: "section_not_found";
};
export declare function buildRegisteredStudentsCsvForSection(sectionId: number): Promise<BuildRegisteredStudentsCsvResult>;
//# sourceMappingURL=adminExportRegisteredStudentsCsvService.d.ts.map