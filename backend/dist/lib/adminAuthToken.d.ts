export type AdminJwtRole = "super_admin" | "admin" | "teacher" | "clinical_teacher" | "clinical_admin";
export type AuthenticatedAdmin = {
    email: string;
    role: AdminJwtRole;
};
export declare const ADMIN_ACCESS_COOKIE_NAME = "admin_access_token";
export declare function issueAdminAccessToken(email: string, role: AdminJwtRole): string;
export declare function verifyAdminAccessToken(authorizationHeader: string | undefined): AuthenticatedAdmin | null;
export declare function verifyAdminAccessTokenString(token: string): AuthenticatedAdmin | null;
export declare function readAdminTokenFromCookieHeader(cookieHeader: string | undefined): string | null;
export declare function verifyAdminAccessTokenFromCookieHeader(cookieHeader: string | undefined): AuthenticatedAdmin | null;
export declare function readTokenTtlSecondsPublic(): number;
//# sourceMappingURL=adminAuthToken.d.ts.map