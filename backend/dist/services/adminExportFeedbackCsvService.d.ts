export type BuildFeedbackCsvForSectionResult = {
    ok: true;
    filename: string;
    csvBody: string;
} | {
    ok: false;
    kind: "section_not_found";
};
export declare function buildFeedbackCsvForSection(sectionId: number): Promise<BuildFeedbackCsvForSectionResult>;
//# sourceMappingURL=adminExportFeedbackCsvService.d.ts.map