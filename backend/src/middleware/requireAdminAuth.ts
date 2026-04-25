import type { NextFunction, Request, Response } from "express";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  type AuthenticatedAdmin,
  verifyAdminAccessToken,
  verifyAdminAccessTokenString,
} from "../lib/adminAuthToken.js";

function resolveAdminUser(req: Request): AuthenticatedAdmin | null {
  const fromAuth = verifyAdminAccessToken(req.headers.authorization);
  if (fromAuth != null) return fromAuth;
  const rawCookie = req.cookies?.[ADMIN_ACCESS_COOKIE_NAME];
  if (typeof rawCookie === "string" && rawCookie.trim() !== "") {
    return verifyAdminAccessTokenString(rawCookie.trim());
  }
  return null;
}

/**
 * Verifies admin JWT from `Authorization: Bearer` or `admin_access_token` cookie.
 * Attaches `req.adminUser` on success.
 */
export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = resolveAdminUser(req);
  if (user == null) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.adminUser = user;
  next();
}
