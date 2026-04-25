/**
 * Lookup by canonical email (identifier normalized to lowercase trim).
 */
export async function findAdminUserByEmail(pool, emailNormalized) {
    const [rows] = await pool.query(`SELECT id, email, password_hash, role
     FROM admin_users
     WHERE LOWER(TRIM(email)) = ?
     LIMIT 1`, [emailNormalized]);
    const row = rows[0];
    if (row == null)
        return null;
    return {
        id: Number(row.id),
        email: String(row.email),
        password_hash: String(row.password_hash),
        role: String(row.role),
    };
}
//# sourceMappingURL=adminUserRepository.js.map