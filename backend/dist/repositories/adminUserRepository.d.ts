import type { Pool } from "mysql2/promise";
export type AdminUserRow = {
    id: number;
    email: string;
    password_hash: string;
    role: string;
};
/**
 * Lookup by canonical email (identifier normalized to lowercase trim).
 */
export declare function findAdminUserByEmail(pool: Pool, emailNormalized: string): Promise<AdminUserRow | null>;
//# sourceMappingURL=adminUserRepository.d.ts.map