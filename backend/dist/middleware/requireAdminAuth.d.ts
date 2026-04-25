import type { NextFunction, Request, Response } from "express";
/**
 * Verifies admin JWT from `Authorization: Bearer` or `admin_access_token` cookie.
 * Attaches `req.adminUser` on success.
 */
export declare function requireAdminAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=requireAdminAuth.d.ts.map