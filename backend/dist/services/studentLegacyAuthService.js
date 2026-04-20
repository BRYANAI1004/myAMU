import { legacyStudentPasswordMd5Hex } from "../repositories/studentLegacyAccountRepository.js";
import { findLegacyStudentById, findLegacyStudentPasswordStored, } from "../repositories/studentLegacyAuthRepository.js";
function verifyPasswordAgainstPasswordStuRow(inputPlain, stored) {
    const s = stored.trim();
    if (s.length === 0)
        return { ok: false, branch: "stored_empty" };
    if (!/^[a-f0-9]{32}$/i.test(s)) {
        return { ok: false, branch: "stored_not_md5_hex" };
    }
    if (legacyStudentPasswordMd5Hex(inputPlain) === s.toLowerCase()) {
        return { ok: true, branch: "password_stu_md5_hex" };
    }
    return { ok: false, branch: "md5_mismatch" };
}
export async function authenticateLegacyStudent(pool, studentIdRaw, passwordRaw) {
    const studentId = studentIdRaw.trim();
    const password = passwordRaw.trim();
    if (studentId.length === 0 || password.length === 0)
        return null;
    const row = await findLegacyStudentById(pool, studentId);
    if (!row) {
        console.info("[auth] TEMP student login denied", {
            studentId,
            stage: "no_students_row",
        });
        return null;
    }
    const storedPw = await findLegacyStudentPasswordStored(pool, studentId);
    if (storedPw == null) {
        console.info("[auth] TEMP student login denied", {
            studentId,
            stage: "no_password_stu_row",
        });
        return null;
    }
    const check = verifyPasswordAgainstPasswordStuRow(password, storedPw);
    if (!check.ok) {
        console.info("[auth] TEMP student login denied", {
            studentId,
            stage: "password_stu_check",
            branch: check.branch,
        });
        return null;
    }
    console.info("[auth] TEMP student password accepted", {
        studentId,
        branch: check.branch,
    });
    const displayName = row.name.trim();
    return {
        studentId: row.id,
        displayName: displayName.length > 0 ? displayName : row.id,
    };
}
//# sourceMappingURL=studentLegacyAuthService.js.map