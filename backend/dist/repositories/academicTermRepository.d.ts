import type { AcademicTermDetail } from "../types/academicTerm.js";
export declare function listAcademicTerms(): Promise<AcademicTermDetail[]>;
export declare function listVisibleAcademicTerms(limit?: number): Promise<AcademicTermDetail[]>;
export declare function listRecentVisibleAcademicTerms(limit?: number): Promise<AcademicTermDetail[]>;
export declare function getAcademicTermById(id: string): Promise<AcademicTermDetail | null>;
export declare function getCurrentRegistrationOpenTerm(): Promise<AcademicTermDetail | null>;
export type AcademicTermInsertRow = Omit<AcademicTermDetail, "is_visible"> & {
    is_visible: boolean;
};
export declare function insertAcademicTerm(row: AcademicTermInsertRow): Promise<AcademicTermDetail>;
/**
 * Full row replace by current primary key `currentId` (supports changing `id` when year/term_name change).
 */
export declare function updateAcademicTermRow(currentId: string, row: AcademicTermInsertRow): Promise<AcademicTermDetail | null>;
//# sourceMappingURL=academicTermRepository.d.ts.map