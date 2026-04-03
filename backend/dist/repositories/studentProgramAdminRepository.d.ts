import type { Pool } from "mysql2/promise";
import type { LegacyMysqlClient } from "./studentLegacyAccountRepository.js";
export type AdminStudentProgramCode = "MAHM" | "DAHM";
export declare function getStudentProgramAdminByStudentId(pool: Pool, studentId: string): Promise<AdminStudentProgramCode | null>;
/**
 * Bulk load program codes for many student ids. Unknown or invalid codes are omitted from the map.
 */
export declare function getStudentProgramAdminMapForStudentIds(pool: Pool, studentIds: string[]): Promise<Map<string, AdminStudentProgramCode>>;
export declare function upsertStudentProgramAdmin(client: LegacyMysqlClient, studentId: string, programCode: AdminStudentProgramCode): Promise<void>;
//# sourceMappingURL=studentProgramAdminRepository.d.ts.map