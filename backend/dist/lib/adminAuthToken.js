import { createHmac, timingSafeEqual } from "node:crypto";
const DEV_FALLBACK_SECRET = "admin-auth-dev-fallback-secret-set-admin-auth-secret";
const TOKEN_HEADER = { alg: "HS256", typ: "JWT" };
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const ADMIN_ROLE_SET = new Set([
    "super_admin",
    "admin",
    "teacher",
    "clinical_teacher",
    "clinical_admin",
]);
/** Well-formed bcrypt hash used only to keep timing stable when the user row is missing. */
const DUMMY_PASSWORD_HASH = "$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa";
function base64UrlEncode(value) {
    return Buffer.from(value, "utf8").toString("base64url");
}
function base64UrlDecode(value) {
    try {
        return Buffer.from(value, "base64url").toString("utf8");
    }
    catch {
        return null;
    }
}
function parsePositiveInt(raw, fallback) {
    const n = Number(raw ?? fallback);
    if (!Number.isInteger(n) || n <= 0)
        return fallback;
    return n;
}
function readAdminAuthSecret() {
    const configured = process.env.ADMIN_AUTH_SECRET?.trim() ?? "";
    if (configured.length > 0)
        return configured;
    if ((process.env.NODE_ENV ?? "development") !== "production") {
        console.warn("[admin-auth] ADMIN_AUTH_SECRET is not set; using a temporary development secret");
        return DEV_FALLBACK_SECRET;
    }
    throw new Error("Missing required environment variable: ADMIN_AUTH_SECRET");
}
const ADMIN_AUTH_SECRET = readAdminAuthSecret();
function readTokenTtlSeconds() {
    return parsePositiveInt(process.env.ADMIN_AUTH_TOKEN_TTL_SECONDS, DEFAULT_TOKEN_TTL_SECONDS);
}
function sign(input) {
    return createHmac("sha256", ADMIN_AUTH_SECRET)
        .update(input)
        .digest("base64url");
}
function isAdminJwtRole(value) {
    return ADMIN_ROLE_SET.has(value);
}
function parsePayload(part) {
    const decoded = base64UrlDecode(part);
    if (decoded == null)
        return null;
    try {
        const parsed = JSON.parse(decoded);
        if (parsed.typ !== "admin")
            return null;
        if (typeof parsed.sub !== "string" || parsed.sub.trim() === "")
            return null;
        if (typeof parsed.role !== "string" || !isAdminJwtRole(parsed.role))
            return null;
        if (!Number.isInteger(parsed.iat) || !Number.isInteger(parsed.exp))
            return null;
        return {
            sub: parsed.sub.trim().toLowerCase(),
            role: parsed.role,
            typ: "admin",
            iat: Number(parsed.iat),
            exp: Number(parsed.exp),
        };
    }
    catch {
        return null;
    }
}
function safeEqualBase64Url(a, b) {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length)
        return false;
    return timingSafeEqual(left, right);
}
export const ADMIN_ACCESS_COOKIE_NAME = "admin_access_token";
export function issueAdminAccessToken(email, role) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === "") {
        throw new Error("email is required to issue an admin access token");
    }
    if (!isAdminJwtRole(role)) {
        throw new Error("invalid admin role for token");
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: normalizedEmail,
        role,
        typ: "admin",
        iat: now,
        exp: now + readTokenTtlSeconds(),
    };
    const encodedHeader = base64UrlEncode(JSON.stringify(TOKEN_HEADER));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    return `${unsigned}.${sign(unsigned)}`;
}
export function verifyAdminAccessToken(authorizationHeader) {
    const raw = authorizationHeader?.trim() ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(raw);
    const token = match?.[1]?.trim() ?? "";
    if (token === "")
        return null;
    return verifyAdminAccessTokenString(token);
}
export function verifyAdminAccessTokenString(token) {
    const trimmed = token.trim();
    if (trimmed === "")
        return null;
    const parts = trimmed.split(".");
    if (parts.length !== 3)
        return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const expected = sign(unsigned);
    if (!safeEqualBase64Url(signature, expected))
        return null;
    const payload = parsePayload(encodedPayload);
    if (payload == null)
        return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now)
        return null;
    return { email: payload.sub, role: payload.role };
}
function parseCookies(cookieHeader) {
    const raw = cookieHeader?.trim() ?? "";
    if (raw === "")
        return {};
    const out = {};
    for (const part of raw.split(";")) {
        const idx = part.indexOf("=");
        if (idx <= 0)
            continue;
        const name = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (name === "")
            continue;
        try {
            out[name] = decodeURIComponent(value);
        }
        catch {
            out[name] = value;
        }
    }
    return out;
}
export function readAdminTokenFromCookieHeader(cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const token = cookies[ADMIN_ACCESS_COOKIE_NAME]?.trim() ?? "";
    return token === "" ? null : token;
}
export function verifyAdminAccessTokenFromCookieHeader(cookieHeader) {
    const token = readAdminTokenFromCookieHeader(cookieHeader);
    if (token == null)
        return null;
    return verifyAdminAccessTokenString(token);
}
export function readTokenTtlSecondsPublic() {
    return readTokenTtlSeconds();
}
//# sourceMappingURL=adminAuthToken.js.map